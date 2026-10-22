import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { APIGERENCIADOR } from '../../config-web'
import './cadescalas.css'

function GerarEscalasIA() {
    const navigate = useNavigate()

    const [funcoes, setFuncoes] = useState([])
    const [erro, setErro] = useState('')
    const [carregando, setCarregando] = useState(true)

    const [data, setData] = useState('')
    const [periodo, setPeriodo] = useState('M')
    const [funcaoSelecionada, setFuncaoSelecionada] = useState('')
    const [funcoesSelecionadas, setFuncoesSelecionadas] = useState([])
    const [escalas, setEscalas] = useState([])
    const [selecaoAberta, setSelecaoAberta] = useState(null)
    const [usuariosDisponiveis, setUsuariosDisponiveis] = useState([])
    const [carregandoUsuarios, setCarregandoUsuarios] = useState(false)
    const [erroUsuarios, setErroUsuarios] = useState('')
    const [gerandoIA, setGerandoIA] = useState(false)
    const [erroIA, setErroIA] = useState('')
    const [mensagemIA, setMensagemIA] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [salvas, setSalvas] = useState([])
    const [erroSalvar, setErroSalvar] = useState('')
    const [mensagemSalvar, setMensagemSalvar] = useState('')
    const [resultadoIncerto, setResultadoIncerto] = useState(false)


    useEffect(() => {
        const controller = new AbortController()

        async function carregarFuncoes() {
            const token = localStorage.getItem('token')

            if (!token) {
                navigate('/Login')
                return
            }

            try {
                const response = await fetch(
                    `http://${APIGERENCIADOR}/consultafuncoes?q=`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        },
                        signal: controller.signal
                    }
                )

                if (response.status === 401) {
                    navigate('/Login')
                    return
                }

                const resultado = await response.json()

                if (!response.ok || !Array.isArray(resultado.funcoes)) {
                    throw new Error(resultado.message || 'Erro ao carregar funções.')
                }

                setFuncoes(resultado.funcoes)
            } catch (error) {
                if (error.name !== 'AbortError') {
                    setErro(error.message)
                }
            } finally {
                if (!controller.signal.aborted) setCarregando(false)
            }
        }

        carregarFuncoes()

        return () => controller.abort()
    }, [navigate])

    function adicionarFuncao() {
        if (gerandoIA || salvando) return
        const funcao = funcoes.find(
            (item) => String(item.func_cod) === funcaoSelecionada
        )

        if (!funcao) return

        if (funcoesSelecionadas.length >= 30) {
            window.alert('O limite é de 30 funções por escala.')
            return
        }

        setFuncoesSelecionadas((anteriores) => [
            ...anteriores,
            {
                id: crypto.randomUUID(),
                func_cod: funcao.func_cod,
                func_desc: funcao.func_desc
            }
        ])
    }

    function adicionarEscala() {
        if (gerandoIA || salvando) return
        if (!data) {
            window.alert('Selecione uma data.')
            return
        }

        if (funcoesSelecionadas.length === 0) {
            window.alert('Adicione pelo menos uma função.')
            return
        }

        if (escalas.some(
            (escala) => escala.data === data && escala.periodo === periodo
        )) {
            window.alert('Esta data e período já foram adicionados.')
            return
        }

        setEscalas((anteriores) => [
            ...anteriores,
            {
                id: crypto.randomUUID(),
                data,
                periodo,
                funcoes: funcoesSelecionadas.map((funcao) => ({
                    ...funcao,
                    id: crypto.randomUUID(),
                    user_cod: null,
                    user_nome: '',
                    cod_user_func: null
                }))
            }
        ])

        setFuncoesSelecionadas([])
        setFuncaoSelecionada('')
    }


    async function abrirSelecao(escala, funcao) {
        if (gerandoIA || salvando) return
        if (selecaoAberta === funcao.id) {
            setSelecaoAberta(null)
            return
        }

        const token = localStorage.getItem('token')

        if (!token) {
            navigate('/Login')
            return
        }

        setSelecaoAberta(funcao.id)
        setUsuariosDisponiveis([])
        setErroUsuarios('')
        setCarregandoUsuarios(true)

        try {
            const parametros = new URLSearchParams({
                funcCod: String(funcao.func_cod),
                data: escala.data
            })

            const response = await fetch(
                `http://${APIGERENCIADOR}/consultarusuariosdisponiveis?${parametros}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )

            if (response.status === 401) {
                navigate('/Login')
                return
            }

            const resultado = await response.json()

            if (!response.ok || !Array.isArray(resultado.usuarios)) {
                throw new Error(
                    resultado.message || 'Erro ao consultar colaboradores.'
                )
            }

            const usuariosFiltrados = resultado.usuarios.filter(
                (usuario) =>
                    !escala.funcoes.some(
                        (item) =>
                            item.id !== funcao.id &&
                            String(item.user_cod) === String(usuario.user_cod)
                    )
            )

            setUsuariosDisponiveis(usuariosFiltrados)
        } catch (error) {
            setErroUsuarios(error.message)
        } finally {
            setCarregandoUsuarios(false)
        }
    }

    function selecionarColaborador(escalaId, funcaoId, usuario) {
        if (gerandoIA || salvando || salvas.includes(escalaId)) return
        setMensagemIA('')
        setEscalas((anteriores) =>
            anteriores.map((escala) =>
                escala.id === escalaId
                    ? {
                        ...escala,
                        funcoes: escala.funcoes.map((funcao) =>
                            funcao.id === funcaoId
                                ? {
                                    ...funcao,
                                    user_cod: usuario.user_cod,
                                    user_nome: usuario.user_nome,
                                    cod_user_func: usuario.cod_user_func,
                                    origem: 'manual'
                                }
                                : funcao
                        )
                    }
                    : escala
            )
        )

        setSelecaoAberta(null)
        setUsuariosDisponiveis([])
        setErroUsuarios('')
    }

    function removerEscala(id) {
        if (gerandoIA || salvando || salvas.includes(id)) return
        setMensagemIA('')
        setEscalas((anteriores) =>
            anteriores.filter((escala) => escala.id !== id)
        )
    }

    function removerFuncaoDaEscala(escalaId, funcaoId) {
        if (gerandoIA || salvando || salvas.includes(escalaId)) return
        setMensagemIA('')
        setSelecaoAberta(null)
        setEscalas((anteriores) => anteriores.map((escala) =>
            escala.id === escalaId
                ? { ...escala, funcoes: escala.funcoes.filter((funcao) => funcao.id !== funcaoId) }
                : escala
        ).filter((escala) => escala.funcoes.length > 0))
    }

    async function gerarComIA() {
        if (gerandoIA || salvando || salvas.length > 0 || resultadoIncerto) return
        setErroIA('')
        setMensagemIA('')

        if (escalas.length === 0) {
            setErroIA('Adicione pelo menos uma escala ao planejamento.')
            return
        }

        const posicoes = escalas.flatMap((escala) =>
            escala.funcoes.map((funcao) => ({ escala, funcao }))
        )
        const vazias = posicoes.filter(({ funcao }) => funcao.origem !== 'manual')

        if (vazias.length === 0) {
            setMensagemIA('Todas as vagas já foram preenchidas manualmente.')
            return
        }

        const token = localStorage.getItem('token')
        if (!token) {
            navigate('/Login')
            return
        }

        const atribuicoesFixas = posicoes.flatMap(({ funcao }, indice) =>
            funcao.origem === 'manual' && funcao.user_cod != null
                ? [{
                    indice,
                    userCod: Number(funcao.user_cod),
                    codUserFunc: Number(funcao.cod_user_func)
                }]
                : []
        )

        setGerandoIA(true)
        setSelecaoAberta(null)
        try {
            const response = await fetch(`http://${APIGERENCIADOR}/geraescalaia`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    escalas: escalas.map((escala) => ({
                        data: escala.data,
                        periodo: escala.periodo,
                        funcoes: escala.funcoes.map((funcao) => Number(funcao.func_cod))
                    })),
                    atribuicoesFixas
                })
            })

            if (response.status === 401) {
                navigate('/Login')
                return
            }

            const resultado = await response.json()
            if (!response.ok || !resultado.success) {
                throw new Error(resultado.message || 'Não foi possível gerar as escalas.')
            }
            if (!Array.isArray(resultado.escalas) || resultado.escalas.length !== posicoes.length) {
                throw new Error('A API retornou uma quantidade inesperada de posições.')
            }

            const recebidas = new Map()
            for (const item of resultado.escalas) {
                if (!Number.isInteger(item.indice) || item.indice < 0 ||
                    item.indice >= posicoes.length || recebidas.has(item.indice)) {
                    throw new Error('A API retornou índices de posições inválidos.')
                }
                const original = posicoes[item.indice]
                if (item.data !== original.escala.data ||
                    item.periodo !== original.escala.periodo ||
                    Number(item.funcCod) !== Number(original.funcao.func_cod)) {
                    throw new Error('A API retornou uma posição diferente da solicitada.')
                }
                if (original.funcao.origem === 'manual' &&
                    (Number(item.userCod) !== Number(original.funcao.user_cod) ||
                        Number(item.codUserFunc) !== Number(original.funcao.cod_user_func))) {
                    throw new Error('A API tentou alterar uma escolha manual.')
                }
                recebidas.set(item.indice, item)
            }

            let indice = 0
            const atualizadas = escalas.map((escala) => ({
                ...escala,
                funcoes: escala.funcoes.map((funcao) => {
                    const item = recebidas.get(indice++)
                    if (funcao.origem === 'manual') return funcao
                    return {
                        ...funcao,
                        user_cod: item.userCod == null ? null : Number(item.userCod),
                        user_nome: item.nome || '',
                        cod_user_func: item.codUserFunc == null ? null : Number(item.codUserFunc),
                        origem: item.userCod == null ? null : 'ia'
                    }
                })
            }))
            setEscalas(atualizadas)
            const preenchidas = resultado.escalas.filter((item) =>
                item.origem === 'ia' && item.userCod != null
            ).length
            setMensagemIA(`Sugestões recebidas: ${preenchidas} vaga(s) preenchida(s) pela IA. Revise antes de salvar.`)
        } catch (error) {
            setErroIA(error.message || 'Erro ao gerar escalas com IA.')
        } finally {
            setGerandoIA(false)
        }
    }

    async function salvarEscalas() {
        if (salvando || gerandoIA || resultadoIncerto) return
        setErroSalvar('')
        setMensagemSalvar('')

        const pendentes = escalas.filter((escala) => !salvas.includes(escala.id))
        if (pendentes.length === 0) {
            setErroSalvar('Não há escalas pendentes para salvar.')
            return
        }

        for (const escala of pendentes) {
            if (escala.funcoes.length === 0 ||
                escala.funcoes.some((funcao) =>
                    !Number.isSafeInteger(Number(funcao.cod_user_func)) ||
                    Number(funcao.cod_user_func) < 1 ||
                    !Number.isSafeInteger(Number(funcao.user_cod)) ||
                    Number(funcao.user_cod) < 1
                )) {
                setErroSalvar('Preencha todas as vagas antes de salvar.')
                return
            }

            const usuarios = escala.funcoes.map((funcao) => String(funcao.user_cod))
            if (new Set(usuarios).size !== usuarios.length) {
                setErroSalvar(`Há colaboradores repetidos na escala de ${escala.data} — ${escala.periodo}.`)
                return
            }
        }

        const token = localStorage.getItem('token')
        if (!token) {
            navigate('/Login')
            return
        }

        const confirmacao = window.confirm(
            `Confirmar o cadastro de ${pendentes.length} escala(s) no banco de dados? ` +
            'Essa operação grava as escalas definitivamente.'
        )
        if (!confirmacao) return

        setSalvando(true)
        setSelecaoAberta(null)
        let quantidadeSalva = 0

        try {
            for (const escala of pendentes) {
                let response
                try {
                    response = await fetch(`http://${APIGERENCIADOR}/inseriescalas`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            data: escala.data,
                            periodo: escala.periodo,
                            itens: escala.funcoes.map((funcao) => ({
                                cod_user_func: Number(funcao.cod_user_func)
                            }))
                        })
                    })
                } catch (error) {
                    // A conexão pode cair depois de o servidor já ter gravado a escala.
                    setResultadoIncerto(true)
                    throw new Error(
                        `Não foi possível confirmar o resultado da escala ${escala.data} — ${escala.periodo}. ` +
                        'Confira as escalas cadastradas antes de tentar novamente.'
                    )
                }

                let resultado
                try {
                    resultado = await response.json()
                } catch {
                    setResultadoIncerto(true)
                    throw new Error(
                        'A resposta do servidor não pôde ser interpretada. ' +
                        'Confira as escalas cadastradas antes de tentar novamente.'
                    )
                }

                if (response.status === 401) {
                    throw new Error('Sua sessão expirou. Entre novamente antes de continuar.')
                }

                if (!response.ok || !resultado.success) {
                    throw new Error(
                        `Escala ${escala.data} — ${escala.periodo}: ` +
                        (resultado.message || 'Não foi possível salvar.')
                    )
                }

                quantidadeSalva += 1
                setSalvas((anteriores) => [...anteriores, escala.id])
                setMensagemSalvar(`${quantidadeSalva} escala(s) salva(s) nesta operação.`)
            }

            setMensagemSalvar(`${quantidadeSalva} escala(s) salva(s) com sucesso!`)
        } catch (error) {
            setErroSalvar(
                `${error.message} ${quantidadeSalva > 0
                    ? `${quantidadeSalva} escala(s) já foram salvas e não serão enviadas novamente.`
                    : ''}`
            )
        } finally {
            setSalvando(false)
        }
    }

    const nomePeriodo = {
        M: 'Manhã',
        T: 'Tarde',
        N: 'Noite'
    }

    return (
        <main className="cad-escalas-page" aria-busy={gerandoIA || salvando}>
            {(gerandoIA || salvando) && (
                <div
                    role="status"
                    aria-live="polite"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontSize: '22px',
                        fontWeight: 'bold',
                        color: '#333'
                    }}
                >
                    {gerandoIA
                        ? 'Gerando informações, aguarde...'
                        : 'Salvando escalas, aguarde...'}
                </div>
            )}

            <section className="cad-escalas-content">
                <header className="cad-escalas-header">
                    <p>INTELIGÊNCIA ARTIFICIAL</p>
                    <h1>Geração de Escalas com IA</h1>
                </header>

                <section className="cad-escalas-section">
                    <h2>Adicionar escala ao planejamento</h2>

                    <div className="cad-escalas-form">
                        <div className="cad-escalas-field">
                            <label htmlFor="ia-data">Data</label>
                            <input
                                id="ia-data"
                                type="date"
                                value={data}
                                onChange={(event) => setData(event.target.value)}
                            />
                        </div>

                        <div className="cad-escalas-field">
                            <label htmlFor="ia-periodo">Período</label>
                            <select
                                id="ia-periodo"
                                value={periodo}
                                onChange={(event) => setPeriodo(event.target.value)}
                            >
                                <option value="M">Manhã</option>
                                <option value="T">Tarde</option>
                                <option value="N">Noite</option>
                            </select>
                        </div>
                    </div>

                    <div className="cad-escalas-function-selector">
                        <select
                            value={funcaoSelecionada}
                            onChange={(event) => setFuncaoSelecionada(event.target.value)}
                            disabled={carregando || !!erro}
                            aria-label="Selecionar função"
                        >
                            <option value="">Selecione uma função</option>
                            {funcoes.map((funcao) => (
                                <option key={funcao.func_cod} value={funcao.func_cod}>
                                    {funcao.func_desc}
                                </option>
                            ))}
                        </select>

                        <button
                            type="button"
                            className="cad-escalas-add"
                            onClick={adicionarFuncao}
                            disabled={!funcaoSelecionada || gerandoIA || salvando}
                        >
                            + Adicionar função
                        </button>
                    </div>

                    {erro && <p className="cad-escalas-error">{erro}</p>}

                    <h3>Funções selecionadas</h3>

                    {funcoesSelecionadas.map((funcao) => (
                        <div className="cad-escalas-function-row" key={funcao.id}>
                            <span>{funcao.func_desc}</span>
                            <button
                                type="button"
                                className="cad-escalas-remove"
                                disabled={gerandoIA || salvando}
                                onClick={() => setFuncoesSelecionadas((anteriores) =>
                                    anteriores.filter((item) => item.id !== funcao.id)
                                )}
                            >
                                Remover
                            </button>
                        </div>
                    ))}

                    <button
                        type="button"
                        className="cad-escalas-add"
                        onClick={adicionarEscala}
                        disabled={gerandoIA || salvando}
                        style={{ marginTop: 20 }}
                    >
                        + Adicionar escala ao planejamento
                    </button>
                </section>

                <section className="cad-escalas-section">
                {escalas.length === 0 ? (
                    <p className="cad-escalas-empty">Nenhuma escala adicionada.</p>
                ) : escalas.map((escala) => (
                    <div className="ia-plano" key={escala.id}>
                        <div className="ia-plano-topo">
                            <div className="ia-plano-identificacao">
                                <strong>{escala.data}</strong>
                                <span>{nomePeriodo[escala.periodo]}</span>
                                <span className="ia-plano-status">
                                    {salvas.includes(escala.id) ? 'Salva' : 'Pendente'}
                                </span>
                            </div>
                            <button type="button" className="cad-escalas-remove"
                                onClick={() => removerEscala(escala.id)}
                                disabled={gerandoIA || salvando || salvas.includes(escala.id)}>
                                Excluir escala
                            </button>
                        </div>
                        <div className="ia-plano-cabecalho">
                            <strong>Função</strong><strong>Usuário</strong><span />
                        </div>
                        {escala.funcoes.map((funcao) => (
                            <div className="ia-plano-linha" key={funcao.id}>
                                <span className="ia-plano-funcao">{funcao.func_desc}</span>
                                <div className="ia-plano-usuario">
                                    <button type="button" className="ia-plano-usuario-campo"
                                        aria-expanded={selecaoAberta === funcao.id}
                                        onClick={() => abrirSelecao(escala, funcao)}
                                        disabled={gerandoIA || salvando || salvas.includes(escala.id)}>
                                        <span>{funcao.user_nome || 'Selecionar usuário'}</span>
                                        <span aria-hidden="true">⌄</span>
                                    </button>
                                    {selecaoAberta === funcao.id && (
                                        <div className="cad-escalas-user-panel ia-plano-opcoes">
                                            <h4>Colaboradores disponíveis</h4>
                                            {carregandoUsuarios ? (
                                                <p>Carregando colaboradores...</p>
                                            ) : erroUsuarios ? (
                                                <p className="cad-escalas-error">{erroUsuarios}</p>
                                            ) : usuariosDisponiveis.length === 0 ? (
                                                <p>Nenhum colaborador disponível.</p>
                                            ) : usuariosDisponiveis.map((usuario) => (
                                                <button key={usuario.cod_user_func} type="button"
                                                    className="cad-escalas-user-option"
                                                    onClick={() => selecionarColaborador(escala.id, funcao.id, usuario)}
                                                    disabled={gerandoIA || salvando}>
                                                    {usuario.user_nome}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button type="button" className="cad-escalas-remove"
                                    onClick={() => removerFuncaoDaEscala(escala.id, funcao.id)}
                                    disabled={gerandoIA || salvando || salvas.includes(escala.id)}>
                                    Excluir função
                                </button>
                            </div>
                        ))}
                    </div>
                ))}
            </section>

            <div className="ia-acoes-rodape">
                <Link className="cad-escalas-button" to="/ConsEscalas">
                    Voltar
                </Link>

                <div className="ia-acoes-direita">
                    <button
                        type="button"
                        className="cad-escalas-button"
                        onClick={gerarComIA}
                        disabled={gerandoIA || salvando || escalas.length === 0 || salvas.length > 0 || resultadoIncerto}
                    >
                        {gerandoIA ? 'Gerando sugestões...' : 'Gerar com IA'}
                    </button>

                    <button
                        type="button"
                        className="cad-escalas-button cad-escalas-primary"
                        onClick={salvarEscalas}
                        disabled={salvando || gerandoIA || resultadoIncerto ||
                            escalas.length === 0 || escalas.every((escala) => salvas.includes(escala.id))}
                    >
                        {salvando ? 'Salvando escalas...' : 'Salvar escalas'}
                    </button>
                </div>
            </div>

            {erroIA && <p className="cad-escalas-error" role="alert">{erroIA}</p>}
            {mensagemIA && <p role="status">{mensagemIA}</p>}
            {erroSalvar && <p className="cad-escalas-error" role="alert">{erroSalvar}</p>}
            {mensagemSalvar && <p role="status">{mensagemSalvar}</p>}
            {resultadoIncerto && (
                <p role="alert">
                    O resultado de uma gravação é incerto. Consulte as escalas cadastradas
                    antes de realizar qualquer nova tentativa. Recarregue a página após conferir.
                </p>
            )}
        </section>
        </main >
    )
}

export default GerarEscalasIA
