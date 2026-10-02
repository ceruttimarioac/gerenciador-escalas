import fastify from 'fastify'
import { Pool } from 'pg'
import { ADDRESS_API, PORT_API, IP_DB, PORT_DB, PASSWORD_DB, USER_DB, DATABASE_DB, SAVE_LOG } from './config-apiregistrador.js'
import { createApiLogger } from '../apiLogger.js'

const app = fastify({ logger: false });
const log = createApiLogger(import.meta.url, 'ApiRegistrador', SAVE_LOG)
const pool = new Pool({
  host: IP_DB,
  port: PORT_DB,
  user: USER_DB,
  password: PASSWORD_DB,
  database: DATABASE_DB
});

pool.on('error', (error) => {
  void log('error', 'database_pool_error', {
    code: error.code || null,
    message: error.message
  })
})

app.addHook('onResponse', async (request, reply) => {
  await log('info', 'http_response', {
    method: request.method,
    route: request.routeOptions?.url || request.url.split('?')[0],
    statusCode: reply.statusCode,
    responseTimeMs: Math.round(request.elapsedTime * 100) / 100
  })
})

app.get('/contextousuario', async (request, reply) => {
  const userId = String(request.query.userId || '')
  if (!userId) {
    reply.code(400)
    return { success: false, message: 'Identificador do usuário não informado' }
  }

  try {
    const { rows } = await pool.query(
      `SELECT U.EMP_ID, U.USER_COD, E.EMP_NOME, E.EMP_CNPJ_CPF
       FROM USUARIO U
       JOIN EMPRESA E ON E.EMP_ID = U.EMP_ID
       WHERE U.USER_FIREBASE_UID = $1
       LIMIT 1`,
      [userId]
    )
    if (!rows.length) {
      reply.code(404)
      return { success: false, message: 'Usuário não vinculado a uma empresa' }
    }
    return rows[0]
  } catch (error) {
    await log('error', 'user_context_query_failed', {
      code: error.code || null,
      message: error.message
    })
    reply.code(503)
    return { success: false, message: 'Não foi possível consultar o usuário' }
  }
})

app.post('/bootstrapempresa', async (request, reply) => {
  const { userId, empNome, empCnpjCpf, userNome, funcDesc } = request.body || {}
  const companyName = String(empNome || '').trim()
  const companyDocument = String(empCnpjCpf || '').trim()
  const initialUserName = String(userNome || '').trim()
  const initialFunction = String(funcDesc || '').trim()
  if (!userId || !companyName || companyName.length > 120 || companyDocument.length > 18 || !initialUserName || initialUserName.length > 120 || !initialFunction || initialFunction.length > 200) {
    reply.code(400)
    return { success: false, message: 'Dados obrigatórios da configuração inicial inválidos' }
  }

  let client
  try {
    client = await pool.connect()
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [userId])

    const { rows: existingUsers } = await client.query(
      `SELECT USER_COD FROM USUARIO WHERE USER_FIREBASE_UID = $1 LIMIT 1`,
      [userId]
    )
    if (existingUsers.length) {
      await client.query('ROLLBACK')
      reply.code(409)
      return { success: false, code: 'USER_ALREADY_REGISTERED', message: 'Esta conta já está vinculada a uma empresa' }
    }

    const { rows: companyRows } = await client.query(
      `INSERT INTO EMPRESA (EMP_NOME, EMP_CNPJ_CPF)
       VALUES ($1, $2)
       RETURNING EMP_ID, EMP_NOME, EMP_CNPJ_CPF`,
      [companyName, companyDocument || null]
    )
    const company = companyRows[0]

    const { rows: userRows } = await client.query(
      `INSERT INTO USUARIO (EMP_ID, USER_NOME, USER_FIREBASE_UID)
       VALUES ($1, $2, $3)
       RETURNING EMP_ID, USER_COD, USER_NOME`,
      [company.emp_id, initialUserName, userId]
    )
    const user = userRows[0]

    const { rows: functionRows } = await client.query(
      `INSERT INTO FUNCAO (EMP_ID, FUNC_DESC)
       VALUES ($1, $2)
       RETURNING FUNC_COD, FUNC_DESC`,
      [company.emp_id, initialFunction]
    )
    const initialRole = functionRows[0]

    await client.query(
      `INSERT INTO FUNC_USER (EMP_ID, FUNC_COD, USER_COD)
       VALUES ($1, $2, $3)`,
      [company.emp_id, initialRole.func_cod, user.user_cod]
    )
    await client.query('COMMIT')
    await log('info', 'initial_company_registered', {
      empId: company.emp_id,
      userCod: user.user_cod,
      functionCode: initialRole.func_cod
    })
    return { success: true, empresa: company, usuario: user, funcao: initialRole }
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {})
    await log('error', 'initial_company_registration_failed', {
      code: error.code || null,
      message: error.message
    })
    reply.code(503)
    return { success: false, message: 'Não foi possível criar a empresa no banco de dados' }
  } finally {
    client?.release()
  }
})

app.get('/consultafuncoes', async (request, reply) => {
  const userId = String(request.query.userId || '')
  const pesquisa = String(request.query.q || '').trim()
  if (!userId) {
    reply.code(400)
    return { success: false, message: 'Identificador do usuário não informado' }
  }

  try {
    const { rows } = await pool.query(
      `SELECT FUNC_COD, FUNC_DESC
       FROM FUNCAO
       WHERE EMP_ID = (
         SELECT EMP_ID FROM USUARIO WHERE USER_FIREBASE_UID = $1 LIMIT 1
       )
         AND ($2 = '' OR FUNC_COD::text ILIKE '%' || $2 || '%' OR FUNC_DESC ILIKE '%' || $2 || '%')
       ORDER BY FUNC_DESC
       LIMIT 100`,
      [userId, pesquisa]
    )
    return { funcoes: rows }
  } catch (error) {
    await log('error', 'functions_query_failed', {
      code: error.code || null,
      message: error.message
    })
    reply.code(503)
    return { success: false, message: 'Não foi possível consultar as funções' }
  }
})

app.post('/cadastrarfuncao', async (request, reply) => {
  const userId = String(request.body?.userId || '')
  const funcDesc = String(request.body?.func_desc || '').trim()
  if (!userId || !funcDesc || funcDesc.length > 200) {
    reply.code(400)
    return { success: false, message: 'Identificador do usuário e descrição são obrigatórios' }
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO FUNCAO (EMP_ID, FUNC_DESC)
       SELECT EMP_ID, $2
       FROM USUARIO
       WHERE USER_FIREBASE_UID = $1
       LIMIT 1
       RETURNING FUNC_COD, FUNC_DESC`,
      [userId, funcDesc]
    )
    if (!rows.length) {
      reply.code(404)
      return { success: false, message: 'Usuário não vinculado a uma empresa' }
    }
    return { success: true, funcao: rows[0] }
  } catch (error) {
    await log('error', 'function_insert_failed', {
      code: error.code || null,
      message: error.message
    })
    reply.code(503)
    return { success: false, message: 'Não foi possível cadastrar a função' }
  }
})

app.post('/cadastrarusuario', async (request, reply) => {
  const { userId, firebaseUid, userNome, funcCod } = request.body || {}
  const normalizedUserName = String(userNome || '').trim()
  const functionCode = Number(funcCod)
  if (!userId || !firebaseUid || firebaseUid.length > 128 || !normalizedUserName || normalizedUserName.length > 120 || !Number.isInteger(functionCode) || functionCode < 1) {
    reply.code(400)
    return { success: false, message: 'Dados obrigatórios do usuário não informados' }
  }

  let client
  try {
    client = await pool.connect()
    await client.query('BEGIN')
    const { rows: ownerRows } = await client.query(
      `SELECT EMP_ID FROM USUARIO WHERE USER_FIREBASE_UID = $1 LIMIT 1`,
      [userId]
    )
    if (!ownerRows.length) {
      await client.query('ROLLBACK')
      reply.code(404)
      return { success: false, message: 'Usuário solicitante não vinculado a uma empresa' }
    }

    const empId = ownerRows[0].emp_id
    const { rows: functionRows } = await client.query(
      `SELECT FUNC_COD FROM FUNCAO WHERE FUNC_COD = $1 AND EMP_ID = $2 LIMIT 1`,
      [functionCode, empId]
    )
    if (!functionRows.length) {
      await client.query('ROLLBACK')
      reply.code(400)
      return { success: false, message: 'A função selecionada não pertence à empresa do usuário' }
    }

    const { rows: userRows } = await client.query(
      `INSERT INTO USUARIO (EMP_ID, USER_NOME, USER_FIREBASE_UID)
       VALUES ($1, $2, $3)
        RETURNING EMP_ID, USER_COD, USER_NOME`,
      [empId, normalizedUserName, firebaseUid]
    )
    const createdUser = userRows[0]

    await client.query(
      `INSERT INTO FUNC_USER (EMP_ID, FUNC_COD, USER_COD)
       VALUES ($1, $2, $3)`,
      [empId, functionCode, createdUser.user_cod]
    )
    await client.query('COMMIT')
    await log('info', 'user_registered', {
      empId: createdUser.emp_id,
      userCod: createdUser.user_cod
    })
    return { usuario: createdUser }
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {})
    await log('error', 'user_insert_failed', {
      code: error.code || null,
      message: error.message
    })
    reply.code(503)
    return { success: false, message: 'Não foi possível gravar o usuário no banco de dados' }
  } finally {
    client?.release()
  }
})


app.get('/consultausuario', async (request, reply) => {
  const { userId } = request.query;
  const pesquisa = String(request.query.q || '').trim();

  if (!userId) {
    await log('warn', 'consultausuario_missing_user_id')
    reply.code(400);
    return { success: false, message: 'Identificador do usuário não informado' };
  }

  try {
    const { rows } = await pool.query(
      `WITH usuario_autenticado AS (
         SELECT EMP_ID
         FROM USUARIO
         WHERE USER_FIREBASE_UID = $1
         LIMIT 1
       )
      SELECT USER_COD, USER_NOME
       FROM USUARIO
       WHERE EMP_ID = (SELECT EMP_ID FROM usuario_autenticado)
         AND ($2 = '' OR USER_COD::text ILIKE '%' || $2 || '%' OR USER_NOME ILIKE '%' || $2 || '%')
       ORDER BY USER_NOME
       LIMIT 100`,
      [userId, pesquisa]
    );

    await log('info', 'usuarios_consultados', {
      resultCount: rows.length,
      filterProvided: pesquisa.length > 0
    })
    return { usuarios: rows };
  } catch (error) {
    await log('error', 'database_query_failed', {
      code: error.code || null,
      message: error.message
    })
    app.log.error(error);
    reply.code(503);
    return { success: false, message: 'Não foi possível consultar os usuários' };
  }
});

app.get('/consultausuario/:userCod', async (request, reply) => {
  const userId = String(request.query.userId || '')
  const userCod = Number(request.params.userCod)
  if (!userId || !Number.isInteger(userCod) || userCod < 1) {
    reply.code(400)
    return { success: false, message: 'Identificador e código do usuário são obrigatórios' }
  }

  try {
    const { rows } = await pool.query(
      `SELECT U.USER_COD, U.USER_NOME, FU.FUNC_COD, F.FUNC_DESC
       FROM USUARIO U
       JOIN USUARIO AUT ON AUT.USER_FIREBASE_UID = $1
         AND AUT.EMP_ID = U.EMP_ID
       LEFT JOIN FUNC_USER FU ON FU.USER_COD = U.USER_COD AND FU.EMP_ID = U.EMP_ID
       LEFT JOIN FUNCAO F ON F.FUNC_COD = FU.FUNC_COD AND F.EMP_ID = FU.EMP_ID
       WHERE U.USER_COD = $2
       ORDER BY FU.COD_USER_FUNC
       LIMIT 1`,
      [userId, userCod]
    )
    if (!rows.length) {
      reply.code(404)
      return { success: false, message: 'Colaborador não encontrado nesta empresa' }
    }
    const { rows: unavailableRows } = await pool.query(
      `SELECT DISTINCT I.DT_INDISPO
       FROM INDISPO_USER I
       JOIN USUARIO AUT ON AUT.EMP_ID = I.EMP_ID AND AUT.USER_FIREBASE_UID = $1
       WHERE I.USER_COD = $2
       ORDER BY I.DT_INDISPO`,
      [userId, userCod]
    )
    return {
      usuario: rows[0],
      indisponibilidades: unavailableRows.map((item) => item.dt_indispo.toISOString().slice(0, 10))
    }
  } catch (error) {
    await log('error', 'user_details_query_failed', {
      code: error.code || null,
      message: error.message
    })
    reply.code(503)
    return { success: false, message: 'Não foi possível consultar o colaborador' }
  }
})

app.put('/atualizarusuario/:userCod', async (request, reply) => {
  const { userId, userNome, funcCod } = request.body || {}
  const unavailableDates = request.body?.indisponibilidades
  const normalizedName = String(userNome || '').trim()
  const userCod = Number(request.params.userCod)
  const functionCode = Number(funcCod)
  if (!userId || !Number.isInteger(userCod) || userCod < 1 || !normalizedName || normalizedName.length > 120 || !Number.isInteger(functionCode) || functionCode < 1) {
    reply.code(400)
    return { success: false, message: 'Informe nome e função válidos' }
  }
  if (unavailableDates !== undefined && (!Array.isArray(unavailableDates) || unavailableDates.length > 1000 || unavailableDates.some((date) => {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return true
    const parsedDate = new Date(`${date}T00:00:00.000Z`)
    return Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date
  }))) {
    reply.code(400)
    return { success: false, message: 'A lista de datas indisponíveis é inválida' }
  }

  let client
  try {
    client = await pool.connect()
    await client.query('BEGIN')
    const { rows: ownerRows } = await client.query(
      `SELECT EMP_ID FROM USUARIO WHERE USER_FIREBASE_UID = $1 LIMIT 1`,
      [userId]
    )
    if (!ownerRows.length) {
      await client.query('ROLLBACK')
      reply.code(404)
      return { success: false, message: 'Usuário solicitante não vinculado a uma empresa' }
    }

    const empId = ownerRows[0].emp_id
    const { rows: targetRows } = await client.query(
      `SELECT USER_COD FROM USUARIO WHERE EMP_ID = $1 AND USER_COD = $2 FOR UPDATE`,
      [empId, userCod]
    )
    if (!targetRows.length) {
      await client.query('ROLLBACK')
      reply.code(404)
      return { success: false, message: 'Colaborador não encontrado nesta empresa' }
    }

    const { rows: functionRows } = await client.query(
      `SELECT FUNC_COD FROM FUNCAO WHERE EMP_ID = $1 AND FUNC_COD = $2 LIMIT 1`,
      [empId, functionCode]
    )
    if (!functionRows.length) {
      await client.query('ROLLBACK')
      reply.code(400)
      return { success: false, message: 'A função selecionada não pertence a esta empresa' }
    }

    const { rows: userRows } = await client.query(
      `UPDATE USUARIO SET USER_NOME = $3 WHERE EMP_ID = $1 AND USER_COD = $2
       RETURNING USER_COD, USER_NOME`,
      [empId, userCod, normalizedName]
    )
    const { rows: assignments } = await client.query(
      `SELECT ID, FUNC_COD FROM FUNC_USER
       WHERE EMP_ID = $1 AND USER_COD = $2
       ORDER BY COD_USER_FUNC`,
      [empId, userCod]
    )

    if (!assignments.some((assignment) => assignment.func_cod === functionCode)) {
      if (assignments.length) {
        await client.query(
          `UPDATE FUNC_USER SET FUNC_COD = $3 WHERE EMP_ID = $1 AND USER_COD = $2 AND ID = $4`,
          [empId, userCod, functionCode, assignments[0].id]
        )
      } else {
        await client.query(
          `INSERT INTO FUNC_USER (EMP_ID, FUNC_COD, USER_COD) VALUES ($1, $2, $3)`,
          [empId, functionCode, userCod]
        )
      }
    }

    if (unavailableDates !== undefined) {
      const uniqueDates = [...new Set(unavailableDates)]
      await client.query(
        `DELETE FROM INDISPO_USER
         WHERE EMP_ID = $1 AND USER_COD = $2
           AND NOT (DT_INDISPO = ANY($3::date[]))`,
        [empId, userCod, uniqueDates]
      )
      if (uniqueDates.length) {
        await client.query(
          `INSERT INTO INDISPO_USER (EMP_ID, USER_COD, DT_INDISPO)
           SELECT $1, $2, selected_dates.DT_INDISPO
           FROM unnest($3::date[]) AS selected_dates(DT_INDISPO)
           WHERE NOT EXISTS (
             SELECT 1 FROM INDISPO_USER I
             WHERE I.EMP_ID = $1 AND I.USER_COD = $2
               AND I.DT_INDISPO = selected_dates.DT_INDISPO
           )`,
          [empId, userCod, uniqueDates]
        )
      }
    }

    await client.query('COMMIT')
    await log('info', 'user_updated', { empId, userCod })
    return { success: true, usuario: userRows[0] }
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {})
    await log('error', 'user_update_failed', {
      code: error.code || null,
      message: error.message
    })
    reply.code(503)
    return { success: false, message: 'Não foi possível atualizar o colaborador' }
  } finally {
    client?.release()
  }
})

app.addHook('onClose', async () => {
  await pool.end();
  await log('info', 'api_closed')
});






const start = async () => {
  try {
    await app.listen({
      port: PORT_API || 3334,
      host: ADDRESS_API || '127.0.0.1'
    });
    await log('info', 'api_started', {
      host: ADDRESS_API || '127.0.0.1',
      port: PORT_API || 3334,
      database: DATABASE_DB
    })
    console.log(`Server is running on port ${PORT_API}`);
  } catch (err) {
    await log('error', 'api_start_failed', { message: err.message })
    app.log.error(err);
    process.exit(1);
  }
};

start();