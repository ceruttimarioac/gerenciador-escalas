import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { APIGERENCIADOR } from '../../config-web'
import { useFeedback } from '../../components/feedback-context.js'
import './gerarescalasia.css'

function GerarEscalasIA() {
    const navigate = useNavigate()
    const location = useLocation()
    const { showFeedback, confirmFeedback } = useFeedback()
    const escalaSelecionada = location.state?.escala
    const codigoEscalaSelecionada = Number(escalaSelecionada?.esc_cod)
    const editandoEscala = Number.isSafeInteger(codigoEscalaSelecionada) &&
        codigoEscalaSelecionada > 0

    const [funcoes, setFuncoes] = useState([])
    const [erro, setErro] = useState('')
    const [carregando, setCarregando] = useState(true)
    const [erroEscala, setErroEscala] = useState('')
    const [carregandoEscala, setCarregandoEscala] = useState(editandoEscala)

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
    const [gravando, setSalvando] = useState(false)
    const [excluindo, setExcluindo] = useState(false)
    const salvando = gravando || excluindo
    const [salvas, setSalvas] = useState([])
    const [resultadoIncerto, setResultadoIncerto] = useState(false)


    useEffect(() => {
        const controller = new AbortController()

        async function carregarFuncoes() {
            const token = localStorage.getItem('token')

            if (!token) {
                showFeedback('Sua sessão expirou. Entre novamente para continuar.', {
                    title: 'Sessão expirada',
                    tone: 'error',
                    onOk: () => navigate('/Login')
                })
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
                    localStorage.removeItem('token')
                    localStorage.removeItem('tokenExpiresAt')
                    showFeedback('Sua sessão expirou. Entre novamente para continuar.', {
                        title: 'Sessão expirada',
                        tone: 'error',
                        onOk: () => navigate('/Login')
                    })
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
                    showFeedback(error.message, { title: 'Não foi possível carregar funções', tone: 'error' })
                }
            } finally {
                if (!controller.signal.aborted) setCarregando(false)
            }
        }

        carregarFuncoes()

        return () => controller.abort()
    }, [navigate, showFeedback])

    useEffect(() => {
        if (!editandoEscala) return

        const controller = new AbortController()

        async function carregarEscala() {
            const token = localStorage.getItem('token')
            if (!token) {
                showFeedback('Sua sessão expirou. Entre novamente para continuar.', {
                    title: 'Sessão expirada',
                    tone: 'error',
                    onOk: () => navigate('/Login')
                })
                return
            }

            try {
                const response = await fetch(
                    `http://${APIGERENCIADOR}/consultarescala/${codigoEscalaSelecionada}`,
                    {
                        headers: { Authorization: 'Bearer ' + token },
                        signal: controller.signal
                    }
                )

                if (response.status === 401) {
                    localStorage.removeItem('token')
                    localStorage.removeItem('tokenExpiresAt')
                    showFeedback('Sua sessão expirou. Entre novamente para continuar.', {
                        title: 'Sessão expirada',
                        tone: 'error',
                        onOk: () => navigate('/Login')
                    })
                    return
                }

                const resultado = await response.json()
                if (!response.ok || !resultado.success ||
                    !resultado.escala || !Array.isArray(resultado.itens)) {
                    throw new Error(resultado.message || 'Não foi possível carregar a escala.')
                }

                const escala = resultado.escala
                setData(escala.esc_data)
                setPeriodo(escala.esc_periodo)
                setEscalas([{
                    id: crypto.randomUUID(),
                    esc_cod: Number(escala.esc_cod),
                    data: escala.esc_data,
                    periodo: escala.esc_periodo,
                    funcoes: resultado.itens.map((item) => ({
                        id: crypto.randomUUID(),
                        func_cod: Number(item.func_cod),
                        func_desc: item.func_desc,
                        user_cod: Number(item.user_cod),
                        user_nome: item.user_nome,
                        cod_user_func: Number(item.cod_user_func),
                        origem: 'manual'
                    }))
                }])
            } catch (error) {
                if (error.name !== 'AbortError') {
                    setErroEscala(error.message)
                    showFeedback(error.message, { title: 'Não foi possível carregar a escala', tone: 'error' })
                }
            } finally {
                if (!controller.signal.aborted) setCarregandoEscala(false)
            }
        }

        carregarEscala()
        return () => controller.abort()
    }, [codigoEscalaSelecionada, editandoEscala, navigate, showFeedback])

    function adicionarFuncao() {
        if (gerandoIA || salvando ||
            (editandoEscala && escalas.some((escala) => salvas.includes(escala.id)))) return
        const funcao = funcoes.find(
            (item) => String(item.func_cod) === funcaoSelecionada
        )

        if (!funcao) return

        if (editandoEscala) {
            const escalaAtual = escalas.find(
                (escala) => escala.esc_cod === codigoEscalaSelecionada
            )
            if (escalaAtual?.funcoes.length >= 30) {
                showFeedback('O limite é de 30 funções por escala.', { title: 'Limite atingido' })
                return
            }

            setEscalas((anteriores) => anteriores.map((escala) =>
                escala.esc_cod === codigoEscalaSelecionada
                    ? {
                        ...escala,
                        funcoes: [...escala.funcoes, {
                            id: crypto.randomUUID(),
                            func_cod: funcao.func_cod,
                            func_desc: funcao.func_desc,
                            user_cod: null,
                            user_nome: '',
                            cod_user_func: null
                        }]
                    }
                    : escala
            ))
            setFuncaoSelecionada('')
            return
        }

        if (funcoesSelecionadas.length >= 30) {
            showFeedback('O limite é de 30 funções por escala.', { title: 'Limite atingido' })
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
            showFeedback('Selecione uma data.', { title: 'Dados incompletos', tone: 'error' })
            return
        }

        if (funcoesSelecionadas.length === 0) {
            showFeedback('Adicione pelo menos uma função.', { title: 'Dados incompletos', tone: 'error' })
            return
        }

        if (escalas.some(
            (escala) => escala.data === data && escala.periodo === periodo
        )) {
            showFeedback('Esta data e período já foram adicionados.', { title: 'Escala duplicada', tone: 'error' })
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
            showFeedback('Sua sessão expirou. Entre novamente para continuar.', {
                title: 'Sessão expirada',
                tone: 'error',
                onOk: () => navigate('/Login')
            })
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
                localStorage.removeItem('token')
                localStorage.removeItem('tokenExpiresAt')
                showFeedback('Sua sessão expirou. Entre novamente para continuar.', {
                    title: 'Sessão expirada',
                    tone: 'error',
                    onOk: () => navigate('/Login')
                })
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
            setSelecaoAberta(null)
            showFeedback(error.message, { title: 'Não foi possível consultar colaboradores', tone: 'error' })
        } finally {
            setCarregandoUsuarios(false)
        }
    }

    function selecionarColaborador(escalaId, funcaoId, usuario) {
        if (gerandoIA || salvando || salvas.includes(escalaId)) return
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

    function limparColaborador(escalaId, funcaoId) {
        if (gerandoIA || salvando || salvas.includes(escalaId)) return
        setEscalas((anteriores) =>
            anteriores.map((escala) =>
                escala.id === escalaId
                    ? {
                        ...escala,
                        funcoes: escala.funcoes.map((funcao) =>
                            funcao.id === funcaoId
                                ? {
                                    ...funcao,
                                    user_cod: null,
                                    user_nome: '',
                                    cod_user_func: null,
                                    origem: null
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
        setEscalas((anteriores) =>
            anteriores.filter((escala) => escala.id !== id)
        )
    }

    async function excluirEscalaCadastrada() {
        if (!editandoEscala || carregandoEscala || gerandoIA || salvando) return

        const confirmacao = await confirmFeedback(
            `Excluir a escala ${codigoEscalaSelecionada} e todos os seus itens? Essa ação não pode ser desfeita.`,
            { title: 'Confirmar exclusão', confirmLabel: 'Excluir escala' }
        )
        if (!confirmacao) return

        const token = localStorage.getItem('token')
        const informarSessaoExpirada = () => {
            localStorage.removeItem('token')
            localStorage.removeItem('tokenExpiresAt')
            showFeedback('Sua sessão expirou. Entre novamente para continuar.', {
                title: 'Sessão expirada',
                tone: 'error',
                onOk: () => navigate('/Login')
            })
        }
        if (!token) {
            informarSessaoExpirada()
            return
        }

        const mensagemFalha = 'Não foi possível confirmar a exclusão. Consulte as escalas cadastradas.'
        setExcluindo(true)
        try {
            const response = await fetch(
                `http://${APIGERENCIADOR}/escalas/${codigoEscalaSelecionada}`,
                { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } }
            )
            if (response.status === 401) {
                informarSessaoExpirada()
                return
            }

            const resultado = await response.json().catch(() => null)
            if (!response.ok || !resultado?.success) {
                showFeedback(resultado?.message || mensagemFalha, {
                    title: 'Não foi possível excluir a escala',
                    tone: 'error'
                })
                return
            }

            showFeedback(resultado.message || 'Escala excluída com sucesso.', {
                title: 'Escala excluída',
                tone: 'success',
                onOk: () => navigate('/ConsEscalas', { replace: true })
            })
        } catch {
            showFeedback(mensagemFalha, {
                title: 'Não foi possível excluir a escala',
                tone: 'error'
            })
        } finally {
            setExcluindo(false)
        }
    }

    function removerFuncaoDaEscala(escalaId, funcaoId) {
        if (gerandoIA || salvando || salvas.includes(escalaId)) return
        setSelecaoAberta(null)
        setEscalas((anteriores) => {
            const atualizadas = anteriores.map((escala) =>
            escala.id === escalaId
                ? { ...escala, funcoes: escala.funcoes.filter((funcao) => funcao.id !== funcaoId) }
                : escala
            )
            return editandoEscala
                ? atualizadas
                : atualizadas.filter((escala) => escala.funcoes.length > 0)
        })
    }

    async function gerarComIA() {
        if (gerandoIA || salvando || salvas.length > 0 || resultadoIncerto) return

        if (escalas.length === 0) {
            showFeedback('Adicione pelo menos uma escala ao planejamento.', {
                title: 'Planejamento vazio',
                tone: 'error'
            })
            return
        }

        const posicoes = escalas.flatMap((escala) =>
            escala.funcoes.map((funcao) => ({ escala, funcao }))
        )
        const vazias = posicoes.filter(({ funcao }) => funcao.origem !== 'manual')

        if (vazias.length === 0) {
            showFeedback('Todas as vagas já foram preenchidas manualmente.')
            return
        }

        const token = localStorage.getItem('token')
        if (!token) {
            showFeedback('Sua sessão expirou. Entre novamente para continuar.', {
                title: 'Sessão expirada',
                tone: 'error',
                onOk: () => navigate('/Login')
            })
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
                localStorage.removeItem('token')
                localStorage.removeItem('tokenExpiresAt')
                showFeedback('Sua sessão expirou. Entre novamente para continuar.', {
                    title: 'Sessão expirada',
                    tone: 'error',
                    onOk: () => navigate('/Login')
                })
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
            showFeedback(
                `Sugestões recebidas: ${preenchidas} vaga(s) preenchida(s) pela IA. Revise antes de salvar.`,
                { title: 'Sugestões geradas', tone: 'success' }
            )
        } catch (error) {
            showFeedback(error.message || 'Erro ao gerar escalas com IA.', {
                title: 'Não foi possível gerar as escalas',
                tone: 'error'
            })
        } finally {
            setGerandoIA(false)
        }
    }

    async function salvarEscalas() {
        if (salvando || gerandoIA || resultadoIncerto) return

        const pendentes = escalas.filter((escala) => !salvas.includes(escala.id))
        if (pendentes.length === 0) {
            showFeedback('Não há escalas pendentes para salvar.', { title: 'Nada para salvar' })
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
                showFeedback('Preencha todas as vagas antes de salvar.', {
                    title: 'Escala incompleta',
                    tone: 'error'
                })
                return
            }

            const usuarios = escala.funcoes.map((funcao) => String(funcao.user_cod))
            if (new Set(usuarios).size !== usuarios.length) {
                showFeedback(`Há colaboradores repetidos na escala de ${escala.data} — ${escala.periodo}.`, {
                    title: 'Colaborador repetido',
                    tone: 'error'
                })
                return
            }
        }

        const token = localStorage.getItem('token')
        if (!token) {
            showFeedback('Sua sessão expirou. Entre novamente para continuar.', {
                title: 'Sessão expirada',
                tone: 'error',
                onOk: () => navigate('/Login')
            })
            return
        }

        const confirmacao = await confirmFeedback(
            editandoEscala
                ? `Confirmar a atualização da escala ${codigoEscalaSelecionada}?`
                : `Confirmar o cadastro de ${pendentes.length} escala(s) no banco de dados? ` +
                    'Essa operação grava as escalas definitivamente.',
            { title: 'Confirmar gravação', confirmLabel: 'OK, continuar' }
        )
        if (!confirmacao) return

        setSalvando(true)
        setSelecaoAberta(null)
        let quantidadeSalva = 0

        try {
            if (editandoEscala) {
                const escala = pendentes[0]
                let response
                try {
                    response = await fetch(
                        `http://${APIGERENCIADOR}/atualizaescalas/${codigoEscalaSelecionada}`,
                        {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: 'Bearer ' + token
                            },
                            body: JSON.stringify({
                                data: escala.data,
                                periodo: escala.periodo,
                                itens: escala.funcoes.map((funcao) => ({
                                    cod_user_func: Number(funcao.cod_user_func)
                                }))
                            })
                        }
                    )
                } catch {
                    setResultadoIncerto(true)
                    throw new Error(
                        'Não foi possível confirmar o resultado da atualização. ' +
                        'Consulte as escalas cadastradas antes de tentar novamente.'
                    )
                }

                let resultado
                try {
                    resultado = await response.json()
                } catch {
                    setResultadoIncerto(true)
                    throw new Error(
                        'A resposta do servidor não pôde ser interpretada. ' +
                        'Consulte as escalas cadastradas antes de tentar novamente.'
                    )
                }

                if (response.status === 401) {
                    throw new Error('Sua sessão expirou. Entre novamente antes de continuar.')
                }
                if (!response.ok || !resultado.success) {
                    throw new Error(resultado.message || 'Não foi possível atualizar a escala.')
                }

                setSalvas([escala.id])
                showFeedback(resultado.message || 'Escala atualizada com sucesso.', {
                    title: 'Escala atualizada',
                    tone: 'success'
                })
                return
            }

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
            }

            showFeedback(`${quantidadeSalva} escala(s) salva(s) com sucesso!`, {
                title: 'Escalas salvas',
                tone: 'success'
            })
        } catch (error) {
            showFeedback(
                `${error.message} ${quantidadeSalva > 0
                    ? `${quantidadeSalva} escala(s) já foram salvas e não serão enviadas novamente.`
                    : ''}`,
                { title: 'Não foi possível salvar as escalas', tone: 'error' }
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
                        : excluindo ? 'Excluindo escala, aguarde...' : 'Salvando escalas, aguarde...'}
                </div>
            )}

            <section className="cad-escalas-content">
                <header className="cad-escalas-header">
                    <p>{editandoEscala ? 'CADASTRO DE ESCALAS' : 'INTELIGÊNCIA ARTIFICIAL'}</p>
                    <h1>{editandoEscala ? 'Editar escala' : 'Geração de Escalas com IA'}</h1>
                </header>

                <section className="cad-escalas-section">
                    <h2>{editandoEscala ? `Escala ${codigoEscalaSelecionada}` : 'Adicionar escala ao planejamento'}</h2>

                    <div className="cad-escalas-form">
                        <div className="cad-escalas-field">
                            <label htmlFor="ia-data">Data</label>
                            <input
                                id="ia-data"
                                type="date"
                                value={editandoEscala
                                    ? escalas.find((escala) => escala.esc_cod === codigoEscalaSelecionada)?.data || data
                                    : data}
                                onChange={(event) => {
                                    const valor = event.target.value
                                    setData(valor)
                                    if (editandoEscala) {
                                        setEscalas((anteriores) => anteriores.map((escala) =>
                                            escala.esc_cod === codigoEscalaSelecionada
                                                ? { ...escala, data: valor }
                                                : escala
                                        ))
                                    }
                                }}
                                disabled={carregandoEscala || gerandoIA || salvando ||
                                    (editandoEscala && salvas.length > 0)}
                            />
                        </div>

                        <div className="cad-escalas-field">
                            <label htmlFor="ia-periodo">Período</label>
                            <select
                                id="ia-periodo"
                                value={editandoEscala
                                    ? escalas.find((escala) => escala.esc_cod === codigoEscalaSelecionada)?.periodo || periodo
                                    : periodo}
                                onChange={(event) => {
                                    const valor = event.target.value
                                    setPeriodo(valor)
                                    if (editandoEscala) {
                                        setEscalas((anteriores) => anteriores.map((escala) =>
                                            escala.esc_cod === codigoEscalaSelecionada
                                                ? { ...escala, periodo: valor }
                                                : escala
                                        ))
                                    }
                                }}
                                disabled={carregandoEscala || gerandoIA || salvando ||
                                    (editandoEscala && salvas.length > 0)}
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
                            disabled={carregando || carregandoEscala || !!erro || !!erroEscala ||
                                (editandoEscala && salvas.length > 0)}
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
                            disabled={!funcaoSelecionada || gerandoIA || salvando || carregandoEscala ||
                                (editandoEscala && salvas.length > 0)}
                        >
                            {editandoEscala ? '+ Adicionar função à escala' : '+ Adicionar função'}
                        </button>
                    </div>

                    {!editandoEscala && <h3>Funções selecionadas</h3>}

                    {!editandoEscala && funcoesSelecionadas.map((funcao) => (
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

                    {!editandoEscala && <button
                        type="button"
                        className="cad-escalas-add"
                        onClick={adicionarEscala}
                        disabled={gerandoIA || salvando}
                        style={{ marginTop: 20 }}
                    >
                        + Adicionar escala ao planejamento
                    </button>}
                </section>

                <section className="cad-escalas-section">
                {carregandoEscala ? (
                    <p className="cad-escalas-empty" role="status">Carregando dados da escala...</p>
                ) : erroEscala ? null : escalas.length === 0 ? (
                    <p className="cad-escalas-empty">Nenhuma escala adicionada.</p>
                ) : escalas.map((escala) => (
                    <div className="ia-plano" key={escala.id}>
                        <div className="ia-plano-topo">
                            <div className="ia-plano-identificacao">
                                <strong>{escala.data}</strong>
                                <span>{nomePeriodo[escala.periodo]}</span>
                                <span className="ia-plano-status">
                                    {salvas.includes(escala.id)
                                        ? (editandoEscala ? 'Atualizada' : 'Salva')
                                        : (editandoEscala ? 'Em edição' : 'Pendente')}
                                </span>
                            </div>
                            <button type="button" className="cad-escalas-remove"
                                onClick={() => editandoEscala ? excluirEscalaCadastrada() : removerEscala(escala.id)}
                                disabled={gerandoIA || salvando ||
                                    (editandoEscala ? carregandoEscala : salvas.includes(escala.id))}>
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
                                            {funcao.user_cod != null && (
                                                <button type="button" className="cad-escalas-user-option"
                                                    onClick={() => limparColaborador(escala.id, funcao.id)}
                                                    disabled={gerandoIA || salvando}>
                                                    Deixar em branco para a IA
                                                </button>
                                            )}
                                            {carregandoUsuarios ? (
                                                <p>Carregando colaboradores...</p>
                                            ) : erroUsuarios ? null : (
                                                usuariosDisponiveis.length === 0 ? (
                                                    <p>Nenhum colaborador disponível.</p>
                                                ) : usuariosDisponiveis.map((usuario) => (
                                                    <button key={usuario.cod_user_func} type="button"
                                                        className="cad-escalas-user-option"
                                                        onClick={() => selecionarColaborador(escala.id, funcao.id, usuario)}
                                                        disabled={gerandoIA || salvando}>
                                                        {usuario.user_nome}
                                                    </button>
                                                ))
                                            )}
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
                        {gerandoIA
                            ? 'Gerando sugestões...'
                            : (editandoEscala ? 'Gerar sugestões com IA' : 'Gerar com IA')}
                    </button>

                    <button
                        type="button"
                        className="cad-escalas-button cad-escalas-primary"
                        onClick={salvarEscalas}
                        disabled={salvando || gerandoIA || resultadoIncerto ||
                            escalas.length === 0 || escalas.every((escala) => salvas.includes(escala.id))}
                    >
                        {salvando
                            ? (editandoEscala ? 'Atualizando escala...' : 'Salvando escalas...')
                            : (editandoEscala ? 'Atualizar escala' : 'Salvar escalas')}
                    </button>
                </div>
            </div>

        </section>
        </main >
    )
}

export default GerarEscalasIA
