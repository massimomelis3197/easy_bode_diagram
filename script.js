
        lucide.createIcons();
        let magChart, phaseChart;

        // ── Click-to-activate wheel zoom ─────────────────────────────────
        // Wheel-zoom is disabled by default on every chart so that scrolling
        // the page while the cursor happens to pass over a chart doesn't
        // hijack the scroll. Clicking a chart "activates" it (enables wheel
        // zoom just for that one); clicking anywhere else deactivates all of
        // them again. Drag-to-pan and pinch-zoom stay always available,
        // since neither conflicts with normal page scrolling.
        const zoomableCanvasIds = new Set();
        function makeChartClickActivatable(chart, canvas) {
            if (!chart || !canvas) return;
            zoomableCanvasIds.add(canvas.id);
            // Charts are destroyed/recreated on every recalculation, but the
            // <canvas> element itself persists — bind the click listener
            // only once per canvas, and always resolve the *current* chart
            // via Chart.js's own registry (Chart.getChart) inside the
            // handler, so it never references a stale, destroyed instance.
            if (!canvas.dataset.zoomClickBound) {
                canvas.dataset.zoomClickBound = '1';
                canvas.addEventListener('click', () => activateChartZoom(canvas));
            }
        }
        function activateChartZoom(activeCanvas) {
            zoomableCanvasIds.forEach(id => {
                const canvas = document.getElementById(id);
                const chart = canvas && Chart.getChart(canvas);
                if (!chart) return;
                const isActive = canvas === activeCanvas;
                if (chart.options && chart.options.plugins && chart.options.plugins.zoom) {
                    chart.options.plugins.zoom.zoom.wheel.enabled = isActive;
                    chart.update('none');
                }
                canvas.classList.toggle('chart-zoom-active', isActive);
            });
        }
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'CANVAS') return;
            zoomableCanvasIds.forEach(id => {
                const canvas = document.getElementById(id);
                const chart = canvas && Chart.getChart(canvas);
                if (chart && chart.options && chart.options.plugins && chart.options.plugins.zoom) {
                    chart.options.plugins.zoom.zoom.wheel.enabled = false;
                    chart.update('none');
                }
                if (canvas) canvas.classList.remove('chart-zoom-active');
            });
        });
        let isDarkMode = false;
        let currentLang = 'it';
        let currentUnit = 'Hz';
        let activeLayers = { real: true, asymptotic: false, contributions: false };
        // Per-chart overrides so the magnitude and phase diagrams can be
        // shown/hidden independently via their own mini-dock — reset to
        // match the shared `activeLayers` (the floating dock) each time a
        // new calculation runs, but can diverge afterward per chart.
        let activeLayersMag = { real: true, asymptotic: false, contributions: false };
        let activeLayersPhase = { real: true, asymptotic: false, contributions: false };
        let contributionVisibilityMag = {};
        let contributionVisibilityPhase = {};
        let isInterfaceExpanded = false;

        let lastFreqDisplay = [], lastFreqRad = [], lastMagData = [], lastPhaseData = [], lastAsympMagData = [], lastAsympPhaseData = [], lastContributionCurves = [];
        let lastWc = null;              // gain-crossover frequency (rad/s), default sine frequency for the temporal study
        let currentSignal = 'step';     // currently selected input signal for the Time Response Study
        let temporalChart;              // Chart.js instance for the temporal response canvas
        let lastTemporalData = null;    // cached { t, u, y, kpis } for the PDF export
        let nyquistChart;                // Chart.js instance for the Nyquist canvas
        let lastNyquistData = null;      // cached { posBranch, negBranch, P, N, Z, minDist, stable } for the PDF export
        let contributionVisibility = {};
        

        const frequenciesHz = [];
        for (let dec = -2; dec <= 9; dec += 0.05) frequenciesHz.push(Math.pow(10, dec));


    const LANG = 
    {
        it: {
            title: 'Benvenuto in <span class="font-bold"> Easy Bode </span>',
            placeholder: 'Scrivi la tua funzione di trasferimento...',
            calcBtn: 'CALCOLA', unitHz: 'Unità: Hz', unitRad: 'Unità: rad/s',
            pdfBtn: 'Scarica PDF', previewLabel: 'Anteprima G(s):',
            syntaxError: '⚠️ Errore di sintassi nella formula!',
            w1: 'Stabilità & Robustezza', pm: 'Margine di Fase', wc: 'Freq. Taglio (𝜔c)',
            gm: 'Margine Guadagno', w180: 'Freq. Inversione (𝜔180)',
            clStab: 'Stabilità Anello Chiuso', stable: 'STABILE', unstable: 'INSTABILE',
            w2: 'Struttura F.d.T.', staticGain: 'Guadagno Stat. (𝘒₀)', sysType: 'Tipo Sistema (𝘨)',
            sysOrder: 'Ordine del Sistema', zeros: 'Zeri Estratti', poles: 'Poli Estratti',
            w3: 'Analisi & Filtro', resPeak: 'Picco di Risonanza', slopeInit: 'Pendenza Iniz.',
            slopeFinal: 'Pendenza Fin.', bandwidth: 'Banda Passante', filterBeh: 'Comportamento Filtro',
            titleMag: 'Diagramma del Modulo (Magnitudo)', titlePhase: 'Diagramma della Fase',
            real: 'Reale', asymp: 'Asintoti', contrib: 'Contributi',
            lp: 'Passa-Basso', hp: 'Passa-Alto', bp: 'Passa-Banda', ap: 'Pass-Tutto', notch: 'Notch',
            absent: 'Assente', nd: 'N/D',
            poleWord: 'Polo', zeroWord: 'Zero', ccWord: 'c.c.', originWord: 'origine',
            temporalTitle: 'Studio della Risposta Temporale', sigStep: 'Gradino Unitario', sigImpulse: 'Impulso', sigRamp: 'Rampa', sigSquare: 'Onda Quadra', sigSine: 'Sinusoide', lblYss: 'Valore di Regime', lblEss: 'Errore a Regime', lblTr: 'Tempo di Salita', lblTs: 'Tempo di Assestamento', lblOvershoot: 'Sovraelongazione Max', inputLbl: 'Ingresso', outputLbl: 'Uscita',
            nyquistTitle: 'Diagramma di Nyquist', lblP: 'Poli Instabili (P)', lblN: 'Avvolgimenti (N)', lblZ: 'Poli Instabili A.C. (Z)', lblDist: 'Distanza min. da (-1,0)',
            nyquistZoomHint: 'Scorri per zoom, trascina per spostare. Il PDF salverà l\'ultimo zoom e l\'ultimo trascinamento da te scelto.', nyquistResetZoom: 'Reset Zoom'
        },
        en: {
            title: 'Welcome to <span class="font-bold"> Easy Bode </span>',
            placeholder: 'Type your transfer function...',
            calcBtn: 'CALCULATE', unitHz: 'Unit: Hz', unitRad: 'Unit: rad/s',
            pdfBtn: 'Download PDF', previewLabel: 'Preview G(s):',
            syntaxError: '⚠️ Syntax error in formula!',
            w1: 'Stability & Robustness', pm: 'Phase Margin', wc: 'Crossover Freq. (𝜔c)',
            gm: 'Gain Margin', w180: 'Phase Cross. Freq. (𝜔180)',
            clStab: 'Closed-Loop Stability', stable: 'STABLE', unstable: 'UNSTABLE',
            w2: 'TF Structure', staticGain: 'Static Gain (𝘒₀)', sysType: 'System Type (𝘨)',
            sysOrder: 'System Order', zeros: 'Extracted Zeros', poles: 'Extracted Poles',
            w3: 'Analysis & Filter', resPeak: 'Resonance Peak', slopeInit: 'Init. Slope',
            slopeFinal: 'Final Slope', bandwidth: 'Bandwidth', filterBeh: 'Filter Behaviour',
            titleMag: 'Magnitude Diagram (dB)', titlePhase: 'Phase Diagram',
            real: 'Real', asymp: 'Asymp.', contrib: 'Contrib.',
            lp: 'Low-Pass', hp: 'High-Pass', bp: 'Band-Pass', ap: 'All-Pass', notch: 'Notch',
            absent: 'None', nd: 'N/A',
            poleWord: 'Pole', zeroWord: 'Zero', ccWord: 'cc', originWord: 'origin',
            temporalTitle: 'Time Response Study', sigStep: 'Unit Step', sigImpulse: 'Impulse', sigRamp: 'Ramp', sigSquare: 'Square Wave', sigSine: 'Sine Wave', lblYss: 'Steady-State Value', lblEss: 'Steady-State Error', lblTr: 'Rise Time', lblTs: 'Settling Time', lblOvershoot: 'Max Overshoot', inputLbl: 'Input', outputLbl: 'Output',
            nyquistTitle: 'Nyquist Diagram', lblP: 'Unstable Poles (P)', lblN: 'Encirclements (N)', lblZ: 'Unstable CL Poles (Z)', lblDist: 'Min. Distance from (-1,0)',
            nyquistZoomHint: 'Scroll to zoom, drag to pan. The PDF will save the last zoom and pan you chose.', nyquistResetZoom: 'Reset Zoom'
        },
        fr: {
            title: 'Bienvenue sur <span class="font-bold"> Easy Bode </span>',
            placeholder: 'Écrivez votre fonction de transfert...',
            calcBtn: 'CALCULER', unitHz: 'Unité: Hz', unitRad: 'Unité: rad/s',
            pdfBtn: 'Télécharger PDF', previewLabel: 'Aperçu G(s):',
            syntaxError: '⚠️ Erreur de syntaxe dans la formule!',
            w1: 'Stabilité & Robustesse', pm: 'Marge de Phase', wc: 'Fréq. Coupure (𝜔c)',
            gm: 'Marge de Gain', w180: 'Fréq. Phase 180° (𝜔180)',
            clStab: 'Stabilité Boucle Fermée', stable: 'STABLE', unstable: 'INSTABLE',
            w2: 'Structure FdT', staticGain: 'Gain Statique (𝘒₀)', sysType: 'Type Système (𝘨)',
            sysOrder: "Ordre du Système", zeros: 'Zéros Extraits', poles: 'Pôles Extraits',
            w3: 'Analyse & Filtre', resPeak: 'Pic de Résonance', slopeInit: 'Pente Init.',
            slopeFinal: 'Pente Fin.', bandwidth: 'Bande Passante', filterBeh: 'Comportement Filtre',
            titleMag: 'Diagramme de Module (dB)', titlePhase: 'Diagramme de Phase',
            real: 'Réel', asymp: 'Asympt.', contrib: 'Contrib.',
            lp: 'Passe-Bas', hp: 'Passe-Haut', bp: 'Passe-Bande', ap: 'Passe-Tout', notch: 'Coupe-Bande',
            absent: 'Absent', nd: 'N/D',
            poleWord: 'Pôle', zeroWord: 'Zéro', ccWord: 'c.c.', originWord: 'origine',
            temporalTitle: 'Étude de la Réponse Temporelle', sigStep: 'Échelon Unitaire', sigImpulse: 'Impulsion', sigRamp: 'Rampe', sigSquare: 'Onde Carrée', sigSine: 'Sinusoïde', lblYss: 'Valeur de Régime', lblEss: 'Erreur de Régime', lblTr: 'Temps de Montée', lblTs: 'Temps d\'Établissement', lblOvershoot: 'Dépassement Max', inputLbl: 'Entrée', outputLbl: 'Sortie',
            nyquistTitle: 'Diagramme de Nyquist', lblP: 'Pôles Instables (P)', lblN: 'Encerclements (N)', lblZ: 'Pôles Instables B.F. (Z)', lblDist: 'Distance min. de (-1,0)',
            nyquistZoomHint: 'Molette pour zoomer, glisser pour déplacer. Le PDF conservera le dernier zoom et déplacement choisis.', nyquistResetZoom: 'Réinitialiser'
        },
        de: {
            title: 'Willkommen bei <span class="font-bold"> Easy Bode </span>',
            placeholder: 'Geben Sie Ihre Übertragungsfunktion ein...',
            calcBtn: 'BERECHNEN', unitHz: 'Einheit: Hz', unitRad: 'Einheit: rad/s',
            pdfBtn: 'PDF Herunterladen', previewLabel: 'Vorschau G(s):',
            syntaxError: '⚠️ Syntaxfehler in der Formel!',
            w1: 'Stabilität & Robustheit', pm: 'Phasenrand', wc: 'Durchtrittsfreq. (𝜔c)',
            gm: 'Amplitudenrand', w180: 'Phasenschnittfreq. (𝜔180)',
            clStab: 'Stabilität Geschl. Kreis', stable: 'STABIL', unstable: 'INSTABIL',
            w2: 'Übertr.-Struktur', staticGain: 'Stat. Verstärkung (𝘒₀)', sysType: 'Systemtyp (𝘨)',
            sysOrder: 'Systemordnung', zeros: 'Extrahierte Nullst.', poles: 'Extrahierte Pole',
            w3: 'Analyse & Filter', resPeak: 'Resonanzspitze', slopeInit: 'Anfangssteig.',
            slopeFinal: 'Endsteigung', bandwidth: 'Bandbreite', filterBeh: 'Filterverhalten',
            titleMag: 'Betragsdiagramm (dB)', titlePhase: 'Phasendiagramm',
            real: 'Real', asymp: 'Asympt.', contrib: 'Beitr.',
            lp: 'Tiefpass', hp: 'Hochpass', bp: 'Bandpass', ap: 'Allpass', notch: 'Bandsperre',
            absent: 'Keiner', nd: 'N/V',
            poleWord: 'Pol', zeroWord: 'Nullstelle', ccWord: 'k.k.', originWord: 'Ursprung',
            temporalTitle: 'Zeitantwort-Analyse', sigStep: 'Einheitssprung', sigImpulse: 'Impuls', sigRamp: 'Rampe', sigSquare: 'Rechteckwelle', sigSine: 'Sinuswelle', lblYss: 'Beharrungswert', lblEss: 'Regelabweichung', lblTr: 'Anstiegszeit', lblTs: 'Einschwingzeit', lblOvershoot: 'Max. Überschwingen', inputLbl: 'Eingang', outputLbl: 'Ausgang',
            nyquistTitle: 'Nyquist-Diagramm', lblP: 'Instabile Pole (P)', lblN: 'Umschlingungen (N)', lblZ: 'Instabile Pole g.K. (Z)', lblDist: 'Min. Abstand von (-1,0)',
            nyquistZoomHint: 'Scrollen zum Zoomen, Ziehen zum Verschieben. Das PDF speichert den zuletzt gewählten Zoom und die Verschiebung.', nyquistResetZoom: 'Zoom zurücksetzen'
        },
        es: {
            title: 'Bienvenido a <span class="font-bold"> Easy Bode </span>',
            placeholder: 'Escribe tu función de transferencia...',
            calcBtn: 'CALCULAR', unitHz: 'Unidad: Hz', unitRad: 'Unidad: rad/s',
            pdfBtn: 'Descargar PDF', previewLabel: 'Vista previa G(s):',
            syntaxError: '⚠️ Error de sintaxis en la fórmula!',
            w1: 'Estabilidad & Robustez', pm: 'Margen de Fase', wc: 'Frec. Corte (𝜔c)',
            gm: 'Margen de Ganancia', w180: 'Frec. Inversión (𝜔180)',
            clStab: 'Estabilidad Lazo Cerrado', stable: 'ESTABLE', unstable: 'INESTABLE',
            w2: 'Estructura FdT', staticGain: 'Ganancia Est. (𝘒₀)', sysType: 'Tipo Sistema (𝘨)',
            sysOrder: 'Orden del Sistema', zeros: 'Ceros Extraídos', poles: 'Polos Extraídos',
            w3: 'Análisis & Filtro', resPeak: 'Pico de Resonancia', slopeInit: 'Pend. Inic.',
            slopeFinal: 'Pend. Final', bandwidth: 'Ancho de Banda', filterBeh: 'Comportamiento Filtro',
            titleMag: 'Diagrama de Módulo (dB)', titlePhase: 'Diagrama de Fase',
            real: 'Real', asymp: 'Asint.', contrib: 'Contrib.',
            lp: 'Paso Bajo', hp: 'Paso Alto', bp: 'Paso Banda', ap: 'Paso Todo', notch: 'Rechazo Banda',
            absent: 'Ausente', nd: 'N/D',
            poleWord: 'Polo', zeroWord: 'Cero', ccWord: 'c.c.', originWord: 'origen',
            temporalTitle: 'Estudio de la Respuesta Temporal', sigStep: 'Escalón Unitario', sigImpulse: 'Impulso', sigRamp: 'Rampa', sigSquare: 'Onda Cuadrada', sigSine: 'Onda Senoidal', lblYss: 'Valor de Régimen', lblEss: 'Error de Régimen', lblTr: 'Tiempo de Subida', lblTs: 'Tiempo de Establecimiento', lblOvershoot: 'Sobreoscilación Máx.', inputLbl: 'Entrada', outputLbl: 'Salida',
            nyquistTitle: 'Diagrama de Nyquist', lblP: 'Polos Inestables (P)', lblN: 'Rodeos (N)', lblZ: 'Polos Inestables L.C. (Z)', lblDist: 'Distancia mín. a (-1,0)',
            nyquistZoomHint: 'Desplaza para zoom, arrastra para mover. El PDF guardará el último zoom y desplazamiento elegidos.', nyquistResetZoom: 'Restablecer Zoom'
        },
        zh: {
            title: '欢迎来到 <span class="font-bold"> Easy Bode </span>',
            placeholder: '输入你的传递函数...',
            calcBtn: '计算', unitHz: '单位: Hz', unitRad: '单位: rad/s',
            pdfBtn: '下载 PDF', previewLabel: '预览 G(s):',
            syntaxError: '⚠️ 公式语法错误！',
            w1: '稳定性 & 鲁棒性', pm: '相位裕量', wc: '截止频率 (𝜔c)',
            gm: '增益裕量', w180: '相位交叉频率 (𝜔180)',
            clStab: '闭环稳定性', stable: '稳定', unstable: '不稳定',
            w2: '传递函数结构', staticGain: '静态增益 (𝘒₀)', sysType: '系统类型 (𝘨)',
            sysOrder: '系统阶次', zeros: '提取的零点', poles: '提取的极点',
            w3: '分析 & 滤波器', resPeak: '谐振峰值', slopeInit: '初始斜率',
            slopeFinal: '最终斜率', bandwidth: '带宽', filterBeh: '滤波器特性',
            titleMag: '幅频特性图 (dB)', titlePhase: '相频特性图',
            real: '实际', asymp: '渐近线', contrib: '贡献',
            lp: '低通', hp: '高通', bp: '带通', ap: '全通', notch: '陷波',
            absent: '无', nd: '未知',
            poleWord: '极点', zeroWord: '零点', ccWord: '共轭', originWord: '原点',
            temporalTitle: '时间响应研究', sigStep: '单位阶跃', sigImpulse: '冲激', sigRamp: '斜坡', sigSquare: '方波', sigSine: '正弦波', lblYss: '稳态值', lblEss: '稳态误差', lblTr: '上升时间', lblTs: '调节时间', lblOvershoot: '最大超调量', inputLbl: '输入', outputLbl: '输出',
            nyquistTitle: '奈奎斯特图', lblP: '不稳定极点 (P)', lblN: '环绕次数 (N)', lblZ: '闭环不稳定极点 (Z)', lblDist: '距(-1,0)最小距离',
            nyquistZoomHint: '滚动缩放，拖动平移。PDF 将保存您选择的最后缩放和平移状态。', nyquistResetZoom: '重置缩放'
        },
        pt: {
            title: 'Bem-vindo ao <span class="font-bold"> Easy Bode </span>',
            placeholder: 'Escreva sua função de transferência...',
            calcBtn: 'CALCULAR', unitHz: 'Unidade: Hz', unitRad: 'Unidade: rad/s',
            pdfBtn: 'Baixar PDF', previewLabel: 'Pré-visualização G(s):',
            syntaxError: '⚠️ Erro de sintaxe na fórmula!',
            w1: 'Estabilidade & Robustez', pm: 'Margem de Fase', wc: 'Freq. Corte (𝜔c)',
            gm: 'Margem de Ganho', w180: 'Freq. Inversão (𝜔180)',
            clStab: 'Estabilidade Malha Fechada', stable: 'ESTÁVEL', unstable: 'INSTÁVEL',
            w2: 'Estrutura FdT', staticGain: 'Ganho Estático (𝘒₀)', sysType: 'Tipo Sistema (𝘨)',
            sysOrder: 'Ordem do Sistema', zeros: 'Zeros Extraídos', poles: 'Polos Extraídos',
            w3: 'Análise & Filtro', resPeak: 'Pico de Ressonância', slopeInit: 'Incl. Inic.',
            slopeFinal: 'Incl. Final', bandwidth: 'Largura de Banda', filterBeh: 'Comportamento Filtro',
            titleMag: 'Diagrama de Módulo (dB)', titlePhase: 'Diagrama de Fase',
            real: 'Real', asymp: 'Assint.', contrib: 'Contrib.',
            lp: 'Passa-Baixo', hp: 'Passa-Alto', bp: 'Passa-Banda', ap: 'Passa-Tudo', notch: 'Rejeição de Banda',
            absent: 'Ausente', nd: 'N/D',
            poleWord: 'Polo', zeroWord: 'Zero', ccWord: 'c.c.', originWord: 'origem',
            temporalTitle: 'Estudo da Resposta Temporal', sigStep: 'Degrau Unitário', sigImpulse: 'Impulso', sigRamp: 'Rampa', sigSquare: 'Onda Quadrada', sigSine: 'Onda Senoidal', lblYss: 'Valor de Regime', lblEss: 'Erro de Regime', lblTr: 'Tempo de Subida', lblTs: 'Tempo de Acomodação', lblOvershoot: 'Sobressinal Máx.', inputLbl: 'Entrada', outputLbl: 'Saída',
            nyquistTitle: 'Diagrama de Nyquist', lblP: 'Polos Instáveis (P)', lblN: 'Envolvimentos (N)', lblZ: 'Polos Instáveis M.F. (Z)', lblDist: 'Distância mín. de (-1,0)',
            nyquistZoomHint: 'Role para zoom, arraste para mover. O PDF salvará o último zoom e deslocamento escolhidos.', nyquistResetZoom: 'Redefinir Zoom'
        },
        ja: {
            title: '<span class="font-bold"> Easy Bode </span> へようこそ',
            placeholder: '伝達関数を入力してください...',
            calcBtn: '計算', unitHz: '単位: Hz', unitRad: '単位: rad/s',
            pdfBtn: 'PDF ダウンロード', previewLabel: 'プレビュー G(s):',
            syntaxError: '⚠️ 数式の構文エラーです！',
            w1: '安定性 & ロバスト性', pm: '位相余裕', wc: '交差周波数 (𝜔c)',
            gm: 'ゲイン余裕', w180: '位相交差周波数 (𝜔180)',
            clStab: '閉ループ安定性', stable: '安定', unstable: '不安定',
            w2: '伝達関数構造', staticGain: '静的ゲイン (𝘒₀)', sysType: 'システム型 (𝘨)',
            sysOrder: 'システム次数', zeros: '抽出された零点', poles: '抽出された極',
            w3: '解析 & フィルタ', resPeak: '共振ピーク', slopeInit: '初期傾き',
            slopeFinal: '最終傾き', bandwidth: '帯域幅', filterBeh: 'フィルタ特性',
            titleMag: '振幅線図 (dB)', titlePhase: '位相線図',
            real: '実際', asymp: '漸近線', contrib: '寄与',
            lp: '低域通過', hp: '高域通過', bp: '帯域通過', ap: 'オールパス', notch: 'ノッチ',
            absent: 'なし', nd: '不明',
            poleWord: '極', zeroWord: '零点', ccWord: '共役', originWord: '原点',
            temporalTitle: '時間応答の研究', sigStep: '単位ステップ', sigImpulse: 'インパルス', sigRamp: 'ランプ', sigSquare: '方形波', sigSine: '正弦波', lblYss: '定常値', lblEss: '定常偏差', lblTr: '立ち上がり時間', lblTs: '整定時間', lblOvershoot: '最大オーバーシュート', inputLbl: '入力', outputLbl: '出力',
            nyquistTitle: 'ナイキスト線図', lblP: '不安定極 (P)', lblN: '周回数 (N)', lblZ: '閉ループ不安定極 (Z)', lblDist: '(-1,0)からの最小距離',
            nyquistZoomHint: 'スクロールでズーム、ドラッグで移動。PDFには最後に選択したズームとパンが保存されます。', nyquistResetZoom: 'ズームをリセット'
        },
        ar: {
            title: 'مرحبًا بك في <span class="font-bold"> Easy Bode </span>',
            placeholder: 'اكتب دالة النقل الخاصة بك...',
            calcBtn: 'احسب', unitHz: 'وحدة: Hz', unitRad: 'وحدة: rad/s',
            pdfBtn: 'تحميل PDF', previewLabel: 'معاينة G(s):',
            syntaxError: '⚠️ خطأ في صياغة المعادلة!',
            w1: 'الاستقرار والمتانة', pm: 'هامش الطور', wc: 'تردد القطع (𝜔c)',
            gm: 'هامش الكسب', w180: 'تردد الطور 180° (𝜔180)',
            clStab: 'استقرار الحلقة المغلقة', stable: 'مستقر', unstable: 'غير مستقر',
            w2: 'بنية دالة النقل', staticGain: 'الكسب الساكن (𝘒₀)', sysType: 'نوع النظام (𝘨)',
            sysOrder: 'رتبة النظام', zeros: 'الأصفار المستخرجة', poles: 'الأقطاب المستخرجة',
            w3: 'التحليل والمرشح', resPeak: 'ذروة الرنين', slopeInit: 'الميل الابتدائي',
            slopeFinal: 'الميل النهائي', bandwidth: 'عرض النطاق', filterBeh: 'سلوك المرشح',
            titleMag: 'مخطط المقدار (dB)', titlePhase: 'مخطط الطور',
            real: 'حقيقي', asymp: 'مقارب', contrib: 'المساهمات',
            lp: 'تمرير منخفض', hp: 'تمرير مرتفع', bp: 'تمرير نطاق', ap: 'تمرير كامل', notch: 'رفض نطاق',
            absent: 'غائب', nd: 'غير محدد',
            poleWord: 'قطب', zeroWord: 'صفر', ccWord: 'مترافق', originWord: 'الأصل',
            temporalTitle: 'دراسة الاستجابة الزمنية', sigStep: 'خطوة الوحدة', sigImpulse: 'نبضة', sigRamp: 'منحدر', sigSquare: 'موجة مربعة', sigSine: 'موجة جيبية', lblYss: 'قيمة الاستقرار', lblEss: 'خطأ الاستقرار', lblTr: 'زمن الصعود', lblTs: 'زمن الاستقرار', lblOvershoot: 'أقصى تجاوز', inputLbl: 'الدخل', outputLbl: 'الخرج',
            nyquistTitle: 'مخطط نايكويست', lblP: 'أقطاب غير مستقرة (P)', lblN: 'عدد الإحاطات (N)', lblZ: 'أقطاب حلقة مغلقة غير مستقرة (Z)', lblDist: 'أدنى مسافة من (-1,0)',
            nyquistZoomHint: 'مرر للتكبير، اسحب للتحريك. سيحفظ ملف PDF آخر تكبير وتحريك اخترته.', nyquistResetZoom: 'إعادة ضبط التكبير'
        },
        hi: {
            title: '<span class="font-bold"> Easy Bode </span> में आपका स्वागत है',
            placeholder: 'अपना ट्रांसफर फंक्शन लिखें...',
            calcBtn: 'गणना करें', unitHz: 'इकाई: Hz', unitRad: 'इकाई: rad/s',
            pdfBtn: 'PDF डाउनलोड', previewLabel: 'पूर्वावलोकन G(s):',
            syntaxError: '⚠️ सूत्र में वाक्यविन्यास त्रुटि!',
            w1: 'स्थिरता और मजबूती', pm: 'फेज मार्जिन', wc: 'कटऑफ आवृत्ति (𝜔c)',
            gm: 'गेन मार्जिन', w180: 'फेज क्रॉसिंग आवृत्ति (𝜔180)',
            clStab: 'क्लोज्ड-लूप स्थिरता', stable: 'स्थिर', unstable: 'अस्थिर',
            w2: 'TF संरचना', staticGain: 'स्थैतिक लाभ (𝘒₀)', sysType: 'सिस्टम प्रकार (𝘨)',
            sysOrder: 'सिस्टम क्रम', zeros: 'निकाले गए शून्य', poles: 'निकाले गए ध्रुव',
            w3: 'विश्लेषण और फ़िल्टर', resPeak: 'अनुनाद शिखर', slopeInit: 'प्रारंभिक ढलान',
            slopeFinal: 'अंतिम ढलान', bandwidth: 'बैंडविड्थ', filterBeh: 'फ़िल्टर व्यवहार',
            titleMag: 'परिमाण आरेख (dB)', titlePhase: 'फेज आरेख',
            real: 'वास्तविक', asymp: 'स्पर्शोद्मुख', contrib: 'योगदान',
            lp: 'लो-पास', hp: 'हाई-पास', bp: 'बैंड-पास', ap: 'ऑल-पास', notch: 'नॉच',
            absent: 'अनुपस्थित', nd: 'अज्ञात',
            poleWord: 'ध्रुव', zeroWord: 'शून्य', ccWord: 'संयुग्मी', originWord: 'मूल',
            temporalTitle: 'समय अनुक्रिया अध्ययन', sigStep: 'यूनिट स्टेप', sigImpulse: 'इम्पल्स', sigRamp: 'रैंप', sigSquare: 'स्क्वायर वेव', sigSine: 'साइन वेव', lblYss: 'स्थिर अवस्था मान', lblEss: 'स्थिर अवस्था त्रुटि', lblTr: 'राइज़ टाइम', lblTs: 'सेटलिंग टाइम', lblOvershoot: 'अधिकतम ओवरशूट', inputLbl: 'इनपुट', outputLbl: 'आउटपुट',
            nyquistTitle: 'नाइक्विस्ट आरेख', lblP: 'अस्थिर ध्रुव (P)', lblN: 'परिक्रमाएँ (N)', lblZ: 'क्लोज्ड-लूप अस्थिर ध्रुव (Z)', lblDist: '(-1,0) से न्यूनतम दूरी',
            nyquistZoomHint: 'ज़ूम के लिए स्क्रॉल करें, खिसकाने के लिए खींचें। PDF आपके द्वारा चुने गए अंतिम ज़ूम और खिसकाव को सहेजेगा।', nyquistResetZoom: 'ज़ूम रीसेट करें'
        }
}

        // Returns the UI string for `key` in the current language (falls back to Italian, then to the raw key).
        function t(key) { return (LANG[currentLang] || LANG['it'])[key] || key; }

        let typingInterval;
        let isTyping = false;

        // Cycles the transfer-function input's placeholder text through a rotating set of example formulas.
        function startPlaceholderAnimation() 
        {
            const input = document.getElementById('tfInput');
            // Se l'utente ha già scritto qualcosa, non fare l'animazione
            if (input.value.trim() !== '') return; 
            
            clearInterval(typingInterval);
            const testoSito = t('placeholder');
            let i = 0;
            input.placeholder = '';
            isTyping = true;
            
            typingInterval = setInterval(() => {
                // Interrompe se l'utente inizia a scrivere durante l'animazione
                if (!isTyping || input.value !== '') {
                    clearInterval(typingInterval);
                    return;
                }
                input.placeholder += testoSito.charAt(i);
                i++;
                if (i >= testoSito.length) {
                    clearInterval(typingInterval);
                    isTyping = false;
                }
            }, 35); // 60ms per lettera
        }

        // Re-applies every static UI label/button/title for the currently selected language.
        function applyTranslations() 
        {
            const L = LANG[currentLang] || LANG['it'];
            document.getElementById('ui-title').innerHTML = L.title;
            document.getElementById('ui-calc-btn').textContent = L.calcBtn;

            startPlaceholderAnimation();
            
            document.getElementById('lbl-unit-btn').textContent = currentUnit === 'Hz' ? L.unitHz : L.unitRad;
            document.getElementById('lbl-pdf-btn').textContent = L.pdfBtn;
            const prevLabel = document.querySelector('.latex-preview-box span');
            if (prevLabel) prevLabel.textContent = L.previewLabel;
            
            document.getElementById('lbl-w1-title').textContent = L.w1;
            document.getElementById('lbl-pm').textContent = L.pm;
            document.getElementById('lbl-wc').textContent = L.wc;
            document.getElementById('lbl-gm').textContent = L.gm;
            document.getElementById('lbl-w180').textContent = L.w180;
            document.getElementById('lbl-cl-stability').textContent = L.clStab;
            document.getElementById('lbl-w2-title').textContent = L.w2;
            document.getElementById('lbl-static-gain').textContent = L.staticGain;
            document.getElementById('lbl-sys-type').textContent = L.sysType;
            document.getElementById('lbl-sys-order').textContent = L.sysOrder;
            document.getElementById('lbl-extracted-zeros-title').textContent = L.zeros;
            document.getElementById('lbl-extracted-poles-title').textContent = L.poles;
            document.getElementById('lbl-w3-title').textContent = L.w3;
            document.getElementById('lbl-resonance-peak').textContent = L.resPeak;
            document.getElementById('lbl-slope-init').textContent = L.slopeInit;
            document.getElementById('lbl-slope-final').textContent = L.slopeFinal;
            document.getElementById('lbl-bandwidth').textContent = L.bandwidth;
            document.getElementById('lbl-filter-behavior').textContent = L.filterBeh;
            document.getElementById('title-mag').textContent = L.titleMag;
            document.getElementById('title-phase').textContent = L.titlePhase;
            document.getElementById('lbl-real').textContent = L.real;
            document.getElementById('lbl-asymp').textContent = L.asymp;
            document.getElementById('lbl-contrib').textContent = L.contrib;
            ['mag', 'phase'].forEach(key => {
                document.getElementById(`mini-lbl-${key}-real`).textContent = L.real;
                document.getElementById(`mini-lbl-${key}-asymp`).textContent = L.asymp;
                document.getElementById(`mini-lbl-${key}-contrib`).textContent = L.contrib;
            });

            document.getElementById('lbl-temporal-title').textContent = L.temporalTitle;
            document.getElementById('lbl-overshoot').textContent = L.lblOvershoot;
            document.getElementById('lbl-yss').textContent = L.lblYss;
            document.getElementById('lbl-ess').textContent = L.lblEss;
            document.getElementById('lbl-tr').textContent = L.lblTr;
            document.getElementById('lbl-ts').textContent = L.lblTs;
            buildSignalMenu();
            updateSignalButtonDisplay();

            document.getElementById('lbl-nyquist-title').textContent = L.nyquistTitle;
            document.getElementById('lbl-nyquist-stability').textContent = L.clStab;
            document.getElementById('lbl-nyquist-p').textContent = L.lblP;
            document.getElementById('lbl-nyquist-n').textContent = L.lblN;
            document.getElementById('lbl-nyquist-z').textContent = L.lblZ;
            document.getElementById('lbl-nyquist-dist').textContent = L.lblDist;
            document.getElementById('lbl-nyquist-zoom-hint').textContent = L.nyquistZoomHint;
            document.getElementById('lbl-nyquist-reset').textContent = L.nyquistResetZoom;
        }
        

        // ── Flag SVGs ─────────────────────────────────────────────────────────
        const FLAGS = {
            it: `<svg class="flag-icon" viewBox="0 0 3 2"><rect width="1" height="2" fill="#009246"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#ce2b37"/></svg>`,
            en: `<svg class="flag-icon" viewBox="0 0 50 30"><rect width="50" height="30" fill="#012169"/><path d="M0,0 L50,30 M0,30 L50,0" stroke="#fff" stroke-width="6"/><path d="M0,0 L50,30 M0,30 L50,0" stroke="#C8102E" stroke-width="2"/><path d="M25,0 L25,30 M0,15 L50,15" stroke="#fff" stroke-width="10"/><path d="M25,0 L25,30 M0,15 L50,15" stroke="#C8102E" stroke-width="6"/></svg>`,
            fr: `<svg class="flag-icon" viewBox="0 0 3 2"><rect width="1" height="2" fill="#002395"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#ED2939"/></svg>`,
            de: `<svg class="flag-icon" viewBox="0 0 5 3"><rect width="5" height="1" fill="#000"/><rect y="1" width="5" height="1" fill="#D00"/><rect y="2" width="5" height="1" fill="#FFCE00"/></svg>`,
            es: `<svg class="flag-icon" viewBox="0 0 3 2"><rect width="3" height="2" fill="#c60b1e"/><rect y="0.5" width="3" height="1" fill="#ffc400"/></svg>`,
            zh: `<svg class="flag-icon" viewBox="0 0 30 20"><rect width="30" height="20" fill="#DE2910"/><polygon points="5,2 6.2,5.8 10,5.8 7,8 8.2,12 5,10 1.8,12 3,8 0,5.8 3.8,5.8" fill="#FFDE00"/></svg>`,
            ja: `<svg class="flag-icon" viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#BC002D"/></svg>`,
            pt: `<svg class="flag-icon" viewBox="0 0 30 20"><rect width="9" height="20" fill="#006600"/><rect x="9" width="21" height="20" fill="#FF0000"/><circle cx="12" cy="10" r="5" fill="#FFD700" stroke="#006600" stroke-width="0.5"/></svg>`,
            ar: `<svg class="flag-icon" viewBox="0 0 30 20"><rect width="30" height="20" fill="#007A3D"/><rect y="7" width="30" height="6" fill="#fff"/><rect y="13" width="30" height="7" fill="#CE1126"/><rect x="0" width="10" height="20" fill="#000"/></svg>`,
            hi: `<svg class="flag-icon" viewBox="0 0 30 20"><rect width="30" height="7" fill="#FF9933"/><rect y="7" width="30" height="6" fill="#fff"/><rect y="13" width="30" height="7" fill="#138808"/><circle cx="15" cy="10" r="2.5" fill="none" stroke="#000080" stroke-width="0.8"/></svg>`
        };
        const LANG_NAMES = { it:'Italiano', en:'English', fr:'Français', de:'Deutsch', es:'Español', zh:'中文', ja:'日本語', pt:'Português', ar:'العربية', hi:'हिन्दी' };
        document.getElementById('langMenu').innerHTML = Object.keys(LANG_NAMES).map(code =>
            `<button onclick="selectLanguage('${code}')" class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-800 dark:text-darktext hover:bg-stone-100 dark:hover:bg-gray-700 transition-all text-left">${FLAGS[code]}<span>${LANG_NAMES[code]}</span></button>`
        ).join('');
        document.getElementById('currentLangFlag').innerHTML = FLAGS.it;

        window.addEventListener('DOMContentLoaded', () => { updateLatexPreview(); applyTranslations(); });

        // Renders a live LaTeX preview of the transfer function as the user types it.
        function updateLatexPreview() {
            const inputStr = document.getElementById('tfInput').value;
            const previewDiv = document.getElementById('latexPreview');
            try {
                if (!inputStr || inputStr.trim() === '') {
                    previewDiv.innerHTML = '$$G(s) = \\dots$$';
                    MathJax.typesetPromise([previewDiv]);
                    return;
                }
                let parts = inputStr.split('/');
                let numStr = parts[0] || '1';
                let denStr = parts[1] || '1';
                // Strips '*' multiplication signs and simplifies 's^1' to 's' for a cleaner LaTeX display.
                function cleanFormula(str) { return str.trim().replace(/\*/g, '').replace(/s\^1/g, 's'); }
                let finalLatex = `$$G(s) = \\frac{${cleanFormula(numStr)}}{${cleanFormula(denStr)}}$$`;
                previewDiv.innerHTML = finalLatex;
                if (window.MathJax && MathJax.typesetPromise) { MathJax.typesetPromise([previewDiv]).catch(e => {}); }
            } catch(e) {}
        }

        // Shows or hides the language-selector dropdown.
        function toggleLangMenu() { document.getElementById('langMenu').classList.toggle('hidden'); }

        // Switches the active language, updates the flag icon and all UI text, and recalculates the plot if one is already shown.
        function selectLanguage(lang) {
            document.getElementById('langMenu').classList.add('hidden');
            currentLang = lang;
            document.getElementById('currentLangFlag').innerHTML = FLAGS[lang] || FLAGS['it'];
            applyTranslations();
            if (isInterfaceExpanded) generateBode();
        }



        // Switches between light and dark theme and swaps the moon/sun icon.
        function toggleDarkMode() {
            isDarkMode = !isDarkMode;
            document.documentElement.classList.toggle('dark');
            document.getElementById('theme-icon').setAttribute('data-lucide', isDarkMode ? 'sun' : 'moon');
            lucide.createIcons();
            if (isInterfaceExpanded) generateBode();
        }

        // Switches the frequency axis between Hz and rad/s and redraws the charts.
        function toggleUnits() {
            currentUnit = currentUnit === 'Hz' ? 'rads' : 'Hz';
            document.getElementById('lbl-unit-btn').innerText = currentUnit === 'Hz' ? t('unitHz') : t('unitRad');
            if (isInterfaceExpanded) generateBode();
        }

 // Toggles one of the three chart layers (real / asymptotic / contributions) on or off and updates the dock button's active styling.
 function toggleLayer(layer) {
    activeLayers[layer] = !activeLayers[layer];
    ['real', 'asymptotic', 'contributions'].forEach(l => {
        const btn = document.getElementById(`btn-${l}`);
        const pill = btn.querySelector('.dock-pill');
        if (activeLayers[l]) {
            btn.classList.remove('opacity-50', 'dark:opacity-60', 'text-stone-600', 'dark:text-gray-300');
            btn.classList.add('text-amber-500', 'dark:text-blue-500', 'opacity-100');
            if (pill) pill.classList.add('is-active');
        } else {
            btn.classList.add('opacity-50', 'dark:opacity-60', 'text-stone-600', 'dark:text-gray-300');
            btn.classList.remove('text-amber-500', 'dark:text-blue-500', 'opacity-100');
            if (pill) pill.classList.remove('is-active');
        }
    });
    if (isInterfaceExpanded) {
        renderContributionsMenu(lastContributionCurves);
      
        renderCharts(lastFreqDisplay, lastMagData, lastPhaseData, lastAsympMagData, lastAsympPhaseData, lastContributionCurves);
    }
}

// Toggles one layer on just the magnitude or just the phase chart's own
// mini-dock, independent of the other chart and of the shared floating
// dock — rebuilds only that one chart's datasets, without recalculating.
function toggleLocalLayer(chartKey, layer) {
    const state = chartKey === 'mag' ? activeLayersMag : activeLayersPhase;
    state[layer] = !state[layer];
    updateMiniDockUI(chartKey);
    renderMiniContribPills(chartKey);
    rerenderSingleChart(chartKey);
}

// Syncs one mini-dock's button styling to its chart's current layer state.
function updateMiniDockUI(chartKey) {
    const state = chartKey === 'mag' ? activeLayersMag : activeLayersPhase;
    ['real', 'asymptotic', 'contributions'].forEach(l => {
        const btn = document.getElementById(`mini-btn-${chartKey}-${l}`);
        if (btn) btn.classList.toggle('mini-dock-active', !!state[l]);
    });
}

// Shows the individual pole/zero/K pills to the right of a mini-dock's
// "Contributi" button — same principle as the main floating dock's pill
// row, but independent per chart (desktop only; hidden via CSS on mobile).
function renderMiniContribPills(chartKey) {
    const container = document.getElementById(`mini-contrib-pills-${chartKey}`);
    if (!container) return;
    const layers = chartKey === 'mag' ? activeLayersMag : activeLayersPhase;
    const visibility = chartKey === 'mag' ? contributionVisibilityMag : contributionVisibilityPhase;
    if (!layers.contributions || !lastContributionCurves.length) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = lastContributionCurves.map(c => {
        const visible = visibility[c.id] !== false;
        return `<button type="button" onclick="toggleLocalContribution('${chartKey}','${c.id}')"
            class="text-[9px] font-semibold px-2 py-1 rounded-full border transition-all whitespace-nowrap cursor-pointer ${visible ? 'opacity-100' : 'opacity-30'}"
            style="border-color:${c.color}; color:${c.color};">${c.label}</button>`;
    }).join('');
}

// Toggles one contribution's visibility for just one chart's mini-dock.
function toggleLocalContribution(chartKey, id) {
    const visibility = chartKey === 'mag' ? contributionVisibilityMag : contributionVisibilityPhase;
    visibility[id] = !(visibility[id] !== false);
    renderMiniContribPills(chartKey);
    rerenderSingleChart(chartKey);
}

// Rebuilds just one chart's datasets from the cached data, without
// touching the other chart or re-running the full calculation.
function rerenderSingleChart(chartKey) {
    const isPhase = chartKey === 'phase';
    const layers = isPhase ? activeLayersPhase : activeLayersMag;
    const visibility = isPhase ? contributionVisibilityPhase : contributionVisibilityMag;
    const datasets = buildDatasetsForChart(lastMagData, lastPhaseData, lastAsympMagData, lastAsympPhaseData, lastContributionCurves, layers, isPhase, visibility);
    const chart = isPhase ? phaseChart : magChart;
    if (chart) { chart.data.datasets = datasets; chart.update(); }
}

        // Shows or hides a single pole/zero/gain contribution curve from the charts.
        function toggleContribution(id) {
            contributionVisibility[id] = !(contributionVisibility[id] !== false);
            renderContributionsMenu(lastContributionCurves);
            renderCharts(lastFreqDisplay, lastMagData, lastPhaseData, lastAsympMagData, lastAsympPhaseData, lastContributionCurves);
        }

  

     // Renders the row of colored pill buttons used to toggle individual pole/zero/gain contributions.
     function renderContributionsMenu(curves) {
    const menu = document.getElementById('contributions-menu');
    const pills = document.getElementById('contrib-pills');
    if (!activeLayers.contributions || !curves || !curves.length) {
        menu.classList.add('hidden');
        return;
    }
    menu.classList.remove('hidden');
    pills.innerHTML = curves.map(c => {
        const visible = contributionVisibility[c.id] !== false;
        return `<button onclick="toggleContribution('${c.id}')"
            class="text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all whitespace-nowrap cursor-pointer ${visible ? 'opacity-100' : 'opacity-30'}"
            style="border-color:${c.color}; color:${c.color};">${c.label}</button>`;
    }).join('');
}

        // ── Core Calculation ──────────────────────────────────────────────────
        // Entry point for the CALCOLA button: parses the transfer function, runs the full analysis pipeline and displays the results.
        function handleCalculation() {
            document.getElementById('syntax-error-alert').classList.add('hidden');
            const expr = document.getElementById('tfInput').value;
            try {
                math.parse(expr);
                isInterfaceExpanded = true;
                document.getElementById('app-header').classList.remove('mt-30');
                document.getElementById('app-header').classList.add('mt-6');
                document.getElementById('dynamic-results-section').classList.remove('hidden');
                document.getElementById('floating-dock-container').classList.remove('hidden');
                contributionVisibility = {};
                generateBode();
            } catch(e) {
                document.getElementById('syntax-error-alert').classList.remove('hidden');
            }
        }

        // ── TF Math Engine ────────────────────────────────────────────────────
        // Extracts the real part of a value that may be a plain number or a mathjs complex number.
        function toReal(v) {
            if (v === null || v === undefined) return 0;
            if (typeof v === 'object' && 're' in v) return v.re;
            return v;
        }
        // Returns the magnitude (absolute value) of a real or complex number.
        function cMag(v) {
            if (typeof v === 'object' && 're' in v) return Math.hypot(v.re, v.im);
            return Math.abs(v);
        }

        // Splits a transfer function string into its numerator/denominator substrings around the '/'.
        function splitTF(exprStr) {
            let idx = exprStr.indexOf('/');
            if (idx === -1) return { numStr: exprStr, denStr: '1' };
            let numStr = exprStr.slice(0, idx).trim();
            let denStr = exprStr.slice(idx + 1).trim();
            // Removes one layer of enclosing parentheses from a string, if present.
            function stripParens(s) {
                s = s.trim();
                if (s.startsWith('(') && s.endsWith(')')) {
                    let depth = 0, ok = true;
                    for (let i = 0; i < s.length; i++) {
                        if (s[i] === '(') depth++;
                        else if (s[i] === ')') { depth--; if (depth === 0 && i !== s.length - 1) { ok = false; break; } }
                    }
                    if (ok) return s.slice(1, -1);
                }
                return s;
            }
            return { numStr: stripParens(numStr) || '1', denStr: stripParens(denStr) || '1' };
        }

        // Evaluates the expression at the (maxDeg+1)-th roots of unity and takes the inverse DFT to recover the polynomial's coefficients exactly (to machine precision) for any degree <= maxDeg, no matter how widely the coefficients' magnitudes vary. Replaces an earlier Vandermonde-fit approach that silently lost high-degree poles/zeros (and misreported system order) once degree or coefficient scale grew.
        function extractPolyCoefficients(exprStr) {
            const maxDeg = 14, N = maxDeg + 1;
            let code;
            try { code = math.compile(exprStr); } catch(e) { return [1]; }
            const samples = [];
            for (let k = 0; k < N; k++) {
                const theta = 2 * Math.PI * k / N;
                const zk = math.complex(Math.cos(theta), Math.sin(theta));
                let val;
                try { val = code.evaluate({ s: zk }); } catch(e) { val = math.complex(0, 0); }
                samples.push(typeof val === 'number' ? math.complex(val, 0) : val);
            }
            const maxSample = Math.max(...samples.map(cMag), 1e-9);
            const coeffs = [];
            for (let j = 0; j < N; j++) {
                let sum = math.complex(0, 0);
                for (let k = 0; k < N; k++) {
                    const theta = -2 * Math.PI * j * k / N;
                    sum = math.add(sum, math.multiply(samples[k], math.complex(Math.cos(theta), Math.sin(theta))));
                }
                coeffs.push(math.divide(sum, N));
            }
            let c = coeffs.map(v => toReal(v));
            // Noise floor scales with the sampled values' magnitude (where
            // floating-point error actually accumulates), not with the
            // coefficients' own max — using the latter wrongly discarded a
            // genuinely real but comparatively small leading coefficient
            // whenever other coefficients (e.g. the constant term) were much
            // larger, silently under-reporting the polynomial's degree and
            // therefore losing poles/zeros from the analysis.
            const noiseFloor = maxSample * 1e-9;
            let deg = c.length - 1;
            while (deg > 0 && Math.abs(c[deg]) < noiseFloor) deg--;
            return c.slice(0, deg + 1);
        }

        // Counts how many leading (lowest-order) coefficients are numerically zero — i.e. the multiplicity of a pole/zero sitting exactly at the origin.
        function originMultiplicity(c) {
            let maxAbs = Math.max(...c.map(v => Math.abs(v)), 1e-9), g = 0;
            while (g < c.length - 1 && Math.abs(c[g]) < maxAbs * 1e-6) g++;
            return g;
        }

        // Finds all roots of a polynomial (given ascending-order coefficients) using the iterative Durand-Kerner method.
        function polyRoots(coeffsAsc) {
            let c = coeffsAsc.slice();
            let maxAbs = Math.max(...c.map(v => Math.abs(v)), 1e-9);
            while (c.length > 1 && Math.abs(c[c.length - 1]) < maxAbs * 1e-7) c.pop();
            const n = c.length - 1;
            if (n <= 0) return [];
            const lead = c[n];
            const a = c.map(v => v / lead);
            let roots = [];
            for (let i = 0; i < n; i++) {
                let ang = (2 * Math.PI * i) / n + 0.4 + i * 0.05;
                roots.push(math.complex(0.4 * Math.cos(ang), 0.4 * Math.sin(ang)));
            }
            // Evaluates a polynomial (ascending-order coefficients) at a given complex point.
            function evalP(x) {
                let res = math.complex(a[n], 0);
                for (let k = n - 1; k >= 0; k--) res = math.add(math.multiply(res, x), math.complex(a[k], 0));
                return res;
            }
            for (let iter = 0; iter < 300; iter++) {
                let newRoots = roots.slice(), maxDelta = 0;
                for (let i = 0; i < n; i++) {
                    let num = evalP(roots[i]);
                    let den = math.complex(1, 0);
                    for (let j = 0; j < n; j++) { if (j !== i) den = math.multiply(den, math.subtract(roots[i], roots[j])); }
                    if (cMag(den) < 1e-14) continue;
                    let delta = math.divide(num, den);
                    newRoots[i] = math.subtract(roots[i], delta);
                    maxDelta = Math.max(maxDelta, cMag(delta));
                }
                roots = newRoots;
                if (maxDelta < 1e-9) break;
            }
            return roots;
        }

        // Groups raw polynomial roots into real roots or complex-conjugate pairs, tagging each with its natural frequency and order for the Bode contribution builder.
        function groupRoots(roots) {
            let groups = [], used = new Array(roots.length).fill(false);
            for (let i = 0; i < roots.length; i++) {
                if (used[i]) continue;
                let r = roots[i];
                if (Math.abs(r.im) < 1e-4) {
                    groups.push({ freq: Math.abs(r.re) || 1e-6, sigma: r.re, order: 1, complex: false, roots: [r] });
                    used[i] = true;
                } else {
                    let pairIdx = -1;
                    for (let j = i + 1; j < roots.length; j++) {
                        if (!used[j] && Math.abs(roots[j].re - r.re) < 1e-3 && Math.abs(roots[j].im + r.im) < 1e-3) { pairIdx = j; break; }
                    }
                    if (pairIdx >= 0) used[pairIdx] = true;
                    used[i] = true;
                    groups.push({ freq: cMag(r), sigma: r.re, omega: Math.abs(r.im), order: 2, complex: true, roots: [r] });
                }
            }
            return groups;
        }

        // Formats a list of poles or zeros into the human-readable string shown in the 'Extracted poles/zeros' card.
        function formatRootsList(roots, gOrigin, letter) {
            let parts = [];
            if (gOrigin > 0) parts.push(`s = 0 (×${gOrigin})`);
            let used = new Array(roots.length).fill(false);
            let counter = 1;
            for (let i = 0; i < roots.length; i++) {
                if (used[i]) continue;
                let r = roots[i];
                if (Math.abs(r.im) < 1e-4) {
                    parts.push(`${letter}${counter} = ${r.re.toFixed(3)}`);
                    used[i] = true; counter++;
                } else {
                    let pairIdx = -1;
                    for (let j = i + 1; j < roots.length; j++) {
                        if (!used[j] && Math.abs(roots[j].re - r.re) < 1e-3 && Math.abs(roots[j].im + r.im) < 1e-3) { pairIdx = j; break; }
                    }
                    if (pairIdx >= 0) used[pairIdx] = true;
                    used[i] = true;
                    parts.push(`${letter}${counter},${counter+1} = ${r.re.toFixed(3)} ± j${Math.abs(r.im).toFixed(3)}`);
                    counter += 2;
                }
            }
            return parts.length ? parts.join(' &nbsp;&nbsp; ') : '--';
        }

        // Runs the full analysis of a transfer function string: polynomial coefficients, poles, zeros, system order, relative degree and static gain K0.
        function computeTFAnalysis(exprStr) {
            const { numStr, denStr } = splitTF(exprStr);
            const numC = extractPolyCoefficients(numStr);
            const denC = extractPolyCoefficients(denStr);
            let gPole = originMultiplicity(denC);
            let gZero = originMultiplicity(numC);
            let denReduced = denC.slice(gPole);
            let numReduced = numC.slice(gZero);
            let poles = polyRoots(denReduced);
            let zeros = polyRoots(numReduced);
            let order = denC.length - 1;
            let relDeg = (denC.length - 1) - (numC.length - 1);
            let K0 = NaN;
            try {
                let code = math.compile(exprStr);
                let smallS = 1e-4;
                K0 = toReal(code.evaluate({ s: smallS })) * Math.pow(smallS, gPole - gZero);
            } catch(e) {}
            return { numC, denC, poles, zeros, gPole, gZero, order, relDeg, K0 };
        }

        // True closed-loop (unity feedback) stability: find the roots of the
        // characteristic polynomial num(s) + den(s) directly, rather than
        // inferring stability only from the open-loop phase/gain margins.
        // The margin-based check silently defaults to "stable" whenever the
        // open-loop magnitude never crosses 0dB — which is exactly what
        // happens for plants with an unstable (right-half-plane) open-loop
        // pole, so it was masking real instability.
        // Determines true closed-loop (unity feedback) stability by finding the roots of the characteristic polynomial num(s)+den(s) — more robust than inferring stability from phase/gain margins alone.
        function closedLoopStability(analysis) {
            const num = analysis.numC || [], den = analysis.denC || [];
            const len = Math.max(num.length, den.length);
            const charPoly = [];
            for (let i = 0; i < len; i++) charPoly.push((den[i] || 0) + (num[i] || 0));
            const clRoots = polyRoots(charPoly);
            if (!clRoots.length) return true;
            const eps = 1e-6;
            return clRoots.every(r => toReal(r) < -eps);
        }

        // ── Asymptotic curve (total) ───────────────────────────────────────────
        // Builds the overall asymptotic (straight-line) magnitude approximation of the Bode plot from the system's poles/zeros/gain.
        function buildAsymptoticCurve(poleGroups, zeroGroups, gPole, gZero, freqRad, startLevelDb) {
            let corners = [];
            poleGroups.forEach(g => corners.push({ freq: g.freq, delta: -20 * g.order }));
            zeroGroups.forEach(g => corners.push({ freq: g.freq, delta: 20 * g.order }));
            corners.sort((a, b) => a.freq - b.freq);
            let slope = -20 * gPole + 20 * gZero;
            let currentLevel = startLevelDb;
            let cornerIdx = 0, prevFreq = freqRad[0];
            let result = [];
            for (let i = 0; i < freqRad.length; i++) {
                let f = freqRad[i];
                while (cornerIdx < corners.length && corners[cornerIdx].freq <= f && corners[cornerIdx].freq >= prevFreq) {
                    let cf = corners[cornerIdx].freq;
                    if (cf > prevFreq) currentLevel += slope * Math.log10(cf / prevFreq);
                    slope += corners[cornerIdx].delta;
                    prevFreq = cf;
                    cornerIdx++;
                }
                if (f > prevFreq) currentLevel += slope * Math.log10(f / prevFreq);
                prevFreq = f;
                result.push(currentLevel);
            }
            return result;
        }

        // Asymptotic phase (total): step from 0 to ±90° per real root, ±180° per complex pair
        // Builds the overall asymptotic phase approximation of the Bode plot.
        function buildAsymptoticPhase(poleGroups, zeroGroups, gPole, gZero, freqRad) {
            // Asymptotic: constant 0 far before all corners, then step at each corner.
            // Standard Bode asymptote: transition starts 1 decade below corner, ends 1 decade above.
            let initPhase = -90 * gPole + 90 * gZero;
            return freqRad.map(w => {
                let phase = initPhase;
                poleGroups.forEach(g => {
                    let contribution = -90 * g.order;
                    let wLow = g.freq / 10, wHigh = g.freq * 10;
                    if (w <= wLow) phase += 0;
                    else if (w >= wHigh) phase += contribution;
                    else phase += contribution * (Math.log10(w) - Math.log10(wLow)) / (Math.log10(wHigh) - Math.log10(wLow));
                });
                zeroGroups.forEach(g => {
                    let contribution = 90 * g.order;
                    let wLow = g.freq / 10, wHigh = g.freq * 10;
                    if (w <= wLow) phase += 0;
                    else if (w >= wHigh) phase += contribution;
                    else phase += contribution * (Math.log10(w) - Math.log10(wLow)) / (Math.log10(wHigh) - Math.log10(wLow));
                });
                return phase;
            });
        }

        // Builds one real + asymptotic magnitude/phase curve for every individual pole, zero, static gain and origin pole/zero — used by the 'contributions' visualization layer.
        function buildContributionCurves(analysis, freqRad) {
            const curves = [];

            if (isFinite(analysis.K0) && analysis.K0 !== 0) {
                const kDb = 20 * Math.log10(Math.abs(analysis.K0));
                const kPhase = analysis.K0 < 0 ? -180 : 0;
                const kArr = freqRad.map(() => kDb), kPh = freqRad.map(() => kPhase);
                curves.push({ id: 'gain-k', label: `K = ${analysis.K0.toFixed(3)}`, dataMag: kArr, dataPhase: kPh, dataMagAsymp: kArr, dataPhaseAsymp: kPh, color: '#eab308' });
            }

            // First-order (or 2nd-order complex) pole response; a zero's
            // response is exactly the reciprocal (mag inverted, phase negated).
            // Computes the complex frequency response of a single first-order (real) or second-order (complex-conjugate) pole contribution at frequency w.
            function poleVal(g, w) {
                const s = math.complex(0, w);
                if (!g.complex) {
                    const wn = Math.abs(g.sigma) || 1e-6;
                    return math.divide(math.complex(wn, 0), math.add(s, math.complex(wn, 0)));
                }
                const wn = g.freq, zeta = Math.abs(g.sigma) / wn, wn2 = wn * wn;
                const denom = math.add(math.add(math.multiply(s, s), math.multiply(math.complex(2 * zeta * wn, 0), s)), math.complex(wn2, 0));
                return math.divide(math.complex(wn2, 0), denom);
            }
            // Builds a full contribution-curve object (real + asymptotic, magnitude + phase, label, color) for one grouped pole or zero. A zero's response is the exact reciprocal of the matching pole's.
            function buildRootCurve(g, isZero, idx) {
                const dataMag = [], dataPhase = [];
                freqRad.forEach(w => {
                    let val = poleVal(g, w);
                    if (isZero) val = math.divide(math.complex(1, 0), val);
                    const polar = val.toPolar();
                    dataMag.push(20 * Math.log10(polar.r));
                    dataPhase.push(polar.phi * (180 / Math.PI));
                });
                const sign = isZero ? 1 : -1;
                const dataMagAsymp = freqRad.map(w => w <= g.freq ? 0 : sign * 20 * g.order * Math.log10(w / g.freq));
                const dataPhaseAsymp = freqRad.map(w => {
                    const wLow = g.freq / 10, wHigh = g.freq * 10;
                    if (w <= wLow) return 0;
                    if (w >= wHigh) return sign * 90 * g.order;
                    return sign * 90 * g.order * (Math.log10(w) - Math.log10(wLow)) / 2;
                });
                return {
                    id: `${isZero ? 'zero' : 'pole'}-${idx}`,
                    label: `${isZero ? t('zeroWord') : t('poleWord')}${g.complex ? ' ' + t('ccWord') : ''} ≈ ${g.freq.toPrecision(3)} rad/s`,
                    dataMag, dataPhase, dataMagAsymp, dataPhaseAsymp,
                    color: isZero ? '#0077b6' : '#ff3b30'
                };
            }
            groupRoots(analysis.poles).forEach((g, i) => curves.push(buildRootCurve(g, false, i + 1)));
            groupRoots(analysis.zeros).forEach((g, i) => curves.push(buildRootCurve(g, true, i + 1)));

            if (analysis.gPole > 0) {
                const dataMag = freqRad.map(w => -20 * analysis.gPole * Math.log10(w));
                const dataPhase = freqRad.map(() => -90 * analysis.gPole);
                curves.push({ id: 'pole-origin', label: `${t('poleWord')} ${t('originWord')} ×${analysis.gPole}`, dataMag, dataPhase, dataMagAsymp: dataMag, dataPhaseAsymp: dataPhase, color: '#ff3b30' });
            }
            if (analysis.gZero > 0) {
                const dataMag = freqRad.map(w => 20 * analysis.gZero * Math.log10(w));
                const dataPhase = freqRad.map(() => 90 * analysis.gZero);
                curves.push({ id: 'zero-origin', label: `${t('zeroWord')} ${t('originWord')} ×${analysis.gZero}`, dataMag, dataPhase, dataMagAsymp: dataMag, dataPhaseAsymp: dataPhase, color: '#0077b6' });
            }
            return curves;
        }

        // ── Parameter panel ───────────────────────────────────────────────────
        // Finds where a sampled curve crosses a target value and returns the interpolated crossing point (fractional index).
        function findCrossing(xArr, yArr, target) {
            for (let i = 0; i < yArr.length - 1; i++) {
                if (yArr[i] === null || yArr[i + 1] === null) continue;
                if ((yArr[i] - target) * (yArr[i + 1] - target) <= 0 && yArr[i] !== yArr[i + 1]) {
                    let tt = (target - yArr[i]) / (yArr[i + 1] - yArr[i]);
                    return { index: i, t: tt };
                }
            }
            return null;
        }
        // Linearly interpolates a value in an array at a fractional index.
        function interpAt(arr, index, t) {
            if (arr[index] === null || arr[index + 1] === null) return null;
            return arr[index] + t * (arr[index + 1] - arr[index]);
        }
        // Linearly interpolates a frequency value at a fractional index.
        function freqAt(freqArr, index, t) {
            let a = Math.log10(freqArr[index]), b = Math.log10(freqArr[index + 1]);
            return Math.pow(10, a + t * (b - a));
        }

        // Computes and displays every derived quantity shown in the 3 result cards: static gain, system type/order, phase/gain margins, crossover frequencies, closed-loop stability, resonance peak, slopes, bandwidth and filter type.
        function updateParameterPanel(analysis, freqRad, freqDisplay, magData, phaseData) {
            const unitLabel = currentUnit === 'Hz' ? 'Hz' : 'rad/s';

            document.getElementById('val-static-gain').innerText = isFinite(analysis.K0) ? analysis.K0.toFixed(3) : '--';
            document.getElementById('val-sys-type').innerText = String(analysis.gPole);
            document.getElementById('val-sys-order').innerText = String(analysis.order);
            document.getElementById('val-extracted-zeros').innerHTML = formatRootsList(analysis.zeros, analysis.gZero, 'z');
            document.getElementById('val-extracted-poles').innerHTML = formatRootsList(analysis.poles, analysis.gPole, 'p');

            let wcCross = findCrossing(freqRad, magData, 0);
            let pmValue = Infinity;
            if (wcCross) {
                let phAtWc = interpAt(phaseData, wcCross.index, wcCross.t);
                let wAtWc = freqAt(freqRad, wcCross.index, wcCross.t);
                pmValue = 180 + phAtWc;
                document.getElementById('val-pm').innerText = pmValue.toFixed(1) + '°';
                document.getElementById('val-wc').innerText = (currentUnit === 'Hz' ? wAtWc / (2 * Math.PI) : wAtWc).toPrecision(3) + ' ' + unitLabel;
                lastWc = wAtWc; // rad/s, used as the default sine input frequency in the temporal response study
            } else {
                document.getElementById('val-pm').innerText = '∞°';
                document.getElementById('val-wc').innerText = '--';
                lastWc = null;
            }

            let w180Cross = findCrossing(freqRad, phaseData, -180);
            let gmValue = Infinity;
            if (w180Cross) {
                let magAtW180 = interpAt(magData, w180Cross.index, w180Cross.t);
                let wAtW180 = freqAt(freqRad, w180Cross.index, w180Cross.t);
                gmValue = -magAtW180;
                document.getElementById('val-gm').innerText = gmValue.toFixed(1) + ' dB';
                document.getElementById('val-w180').innerText = (currentUnit === 'Hz' ? wAtW180 / (2 * Math.PI) : wAtW180).toPrecision(3) + ' ' + unitLabel;
            } else {
                document.getElementById('val-gm').innerText = '∞ dB';
                document.getElementById('val-w180').innerText = '--';
            }

            let stable = closedLoopStability(analysis);
            let clEl = document.getElementById('val-cl-stability');
            clEl.innerText = stable ? t('stable') : t('unstable');
            clEl.className = 'text-sm font-bold uppercase tracking-wide px-2.5 py-1 rounded-md inline-block mt-1 ' + (stable
                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400');

            let slopeInit = -20 * analysis.gPole + 20 * analysis.gZero;
            let slopeFinal = -20 * analysis.relDeg;
            document.getElementById('val-slope-init').innerText = (slopeInit >= 0 ? '+' : '') + slopeInit + ' dB/dec';
            document.getElementById('val-slope-final').innerText = (slopeFinal >= 0 ? '+' : '') + slopeFinal + ' dB/dec';

            let validMag = magData.filter(v => v !== null);
            let dcLevel = magData[0] !== null ? magData[0] : validMag[0];
            let peak = Math.max(...validMag);
            let peakDelta = peak - dcLevel;
            document.getElementById('val-resonance-peak').innerText = peakDelta > 0.5 ? '+' + peakDelta.toFixed(2) + ' dB' : t('absent');

            let bwIdx = findCrossing(freqRad, magData.map(v => v === null ? null : v - dcLevel), -3);
            if (bwIdx) {
                let wBw = freqAt(freqRad, bwIdx.index, bwIdx.t);
                document.getElementById('val-bandwidth').innerText = (currentUnit === 'Hz' ? wBw / (2 * Math.PI) : wBw).toPrecision(3) + ' ' + unitLabel;
            } else {
                document.getElementById('val-bandwidth').innerText = t('nd');
            }

            let magLow = validMag[0], magHigh = validMag[validMag.length - 1];
            let behavior;
            if (peakDelta > 3 && magLow < peak - 3 && magHigh < peak - 3) behavior = t('bp');
            else if (magHigh < magLow - 3) behavior = t('lp');
            else if (magLow < magHigh - 3) behavior = t('hp');
            else behavior = t('ap');
            document.getElementById('val-filter-behavior').innerText = behavior;
        }

        // ═══════════════════════════════════════════════════════════════════
        // STUDIO DELLA RISPOSTA TEMPORALE — state-space simulation engine
        // ═══════════════════════════════════════════════════════════════════

        // Builds the controllable-canonical state-space matrices (A, B, C, D)
        // from a transfer function's ascending numerator/denominator
        // coefficients. For an order-0 system (pure gain, no dynamics) there
        // is no state: the output just tracks D*u(t) instantaneously.
        function buildStateSpace(numC, denC) {
            const n = denC.length - 1;
            if (n <= 0) {
                const D = denC[0] ? (numC[0] || 0) / denC[0] : 0;
                return { A: [], B: [], C: [], D, n: 0 };
            }
            const an = denC[n];
            const a = denC.map(v => v / an);           // normalize denominator to monic
            const b = new Array(n + 1).fill(0);
            for (let i = 0; i < numC.length && i <= n; i++) b[i] = numC[i] / an;
            const D = b[n];                              // feed-through term (numerator reaches full degree n)
            const C = new Array(n);
            for (let i = 0; i < n; i++) C[i] = b[i] - D * a[i];
            const A = [];
            for (let i = 0; i < n; i++) {
                const row = new Array(n).fill(0);
                if (i < n - 1) row[i + 1] = 1;
                else for (let j = 0; j < n; j++) row[j] = -a[j];
                A.push(row);
            }
            const B = new Array(n).fill(0);
            B[n - 1] = 1;
            return { A, B, C, D, n };
        }

        // Dynamic simulation horizon: ~5 time constants of the slowest stable
        // pole (the one closest to the imaginary axis), or a 10s default when
        // the system is unstable or has only origin poles (no finite decay
        // rate to time the simulation against).
        function computeTmax(poles, gPole) {
            const stableAbsParts = (poles || []).map(p => toReal(p)).filter(re => re < -1e-6).map(re => Math.abs(re));
            if (gPole > 0 || stableAbsParts.length === 0) return 10;
            const sigmaMin = Math.min(...stableAbsParts);
            let T = 5 / sigmaMin;
            if (!isFinite(T) || T <= 0) return 10;
            return Math.min(Math.max(T, 0.01), 500);
        }

        // Value of the chosen input signal at a given time (the impulse is
        // handled separately, via an initial state jump — see simulateTimeResponse).
        function inputSignalValue(type, time, Tmax, wc) {
            switch (type) {
                case 'ramp': return time;
                case 'square': {
                    const halfPeriod = Tmax / 4; // period = Tmax/2
                    return (Math.floor(time / halfPeriod) % 2 === 0) ? 1 : -1;
                }
                case 'sine': return Math.sin((wc || 1) * time);
                default: return 1; // step
            }
        }

        // n x n matrix times an n-vector.
        function matVecMul(A, x) { return A.map(row => row.reduce((s, aij, j) => s + aij * x[j], 0)); }

        // Simulates the state-space system's response to the chosen input
        // using 4th-order Runge-Kutta integration over 500 fixed steps.
        // The unit impulse is simulated exactly via the classic trick of an
        // initial state jump x(0)=B with zero input afterwards, rather than
        // approximating δ(t) with a narrow pulse (whose plotted amplitude
        // would otherwise depend arbitrarily on the integration step size).
        function simulateTimeResponse(ss, signalType, Tmax, wc) {
            const N = 500, dt = Tmax / N;
            const tArr = [], uArr = [], yArr = [];
            const isImpulse = signalType === 'impulse';

            if (ss.n === 0) {
                for (let k = 0; k <= N; k++) {
                    const time = k * dt;
                    const u = isImpulse ? (k === 0 ? 1 : 0) : inputSignalValue(signalType, time, Tmax, wc);
                    tArr.push(time); uArr.push(u);
                    yArr.push(isImpulse ? (k === 0 ? ss.D : 0) : ss.D * u);
                }
                return { t: tArr, u: uArr, y: yArr };
            }

            const { A, B, C, D, n } = ss;
            let x = isImpulse ? B.slice() : new Array(n).fill(0);
            const uAt = (time) => isImpulse ? 0 : inputSignalValue(signalType, time, Tmax, wc);
            const f = (xVec, uVal) => matVecMul(A, xVec).map((v, i) => v + B[i] * uVal);

            for (let k = 0; k <= N; k++) {
                const time = k * dt;
                tArr.push(time);
                uArr.push(isImpulse ? (k === 0 ? 1 : 0) : uAt(time));
                yArr.push(x.reduce((s, xi, i) => s + C[i] * xi, 0) + D * uAt(time));

                if (k === N) break;
                const u1 = uAt(time), u2 = uAt(time + dt / 2), u4 = uAt(time + dt);
                const k1 = f(x, u1);
                const k2 = f(x.map((xi, i) => xi + dt / 2 * k1[i]), u2);
                const k3 = f(x.map((xi, i) => xi + dt / 2 * k2[i]), u2);
                const k4 = f(x.map((xi, i) => xi + dt * k3[i]), u4);
                x = x.map((xi, i) => xi + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
            }
            return { t: tArr, u: uArr, y: yArr };
        }

        // Performance indicators are always computed from the STEP response,
        // independent of whichever signal is currently shown on the chart —
        // rise time, overshoot, settling time and steady-state error are
        // classic step-response metrics and describe the system itself, not
        // a property of the selected input.
        function computeStepKPIs(t, y, isConvergent) {
            if (!isConvergent) return { yss: null, tr: null, ts: null, overshoot: null, ess: null };

            const yss = y[y.length - 1];
            const ess = 1 - yss;

            let t10 = null, t90 = null;
            const target10 = 0.1 * yss, target90 = 0.9 * yss;
            for (let i = 0; i < y.length; i++) {
                const reached10 = yss >= 0 ? y[i] >= target10 : y[i] <= target10;
                const reached90 = yss >= 0 ? y[i] >= target90 : y[i] <= target90;
                if (t10 === null && reached10) t10 = t[i];
                if (t90 === null && reached90) { t90 = t[i]; break; }
            }
            const tr = (t10 !== null && t90 !== null) ? (t90 - t10) : null;

            let overshoot = 0;
            if (Math.abs(yss) > 1e-9) {
                const extreme = yss >= 0 ? Math.max(...y) : Math.min(...y);
                overshoot = Math.max(0, (Math.abs(extreme) - Math.abs(yss)) / Math.abs(yss) * 100);
            }

            const band = Math.max(Math.abs(yss) * 0.02, 1e-6);
            let lastOutside = -1;
            for (let i = y.length - 1; i >= 0; i--) {
                if (Math.abs(y[i] - yss) > band) { lastOutside = i; break; }
            }
            const ts = lastOutside === -1 ? 0 : t[Math.min(lastOutside + 1, t.length - 1)];

            return { yss, tr, ts, overshoot, ess };
        }

        // Formats a time value in seconds, switching to milliseconds for very
        // short durations so short-lived (high-frequency) systems stay readable.
        function formatTime(v) {
            if (v === null || v === undefined) return t('nd');
            return v < 0.001 ? (v * 1000).toFixed(2) + ' ms' : v.toFixed(3) + ' s';
        }

        // Runs the full temporal-response pipeline for the current transfer
        // function: builds the state-space model, simulates the selected
        // input signal for the chart, always simulates the step response
        // separately for the KPIs, then updates the DOM and the chart.
        function calculateTemporalResponse(analysis) {
            const ss = buildStateSpace(analysis.numC, analysis.denC);
            const Tmax = computeTmax(analysis.poles, analysis.gPole);
            const wc = lastWc || 1;
            const isConvergent = analysis.gPole === 0 && analysis.poles.every(p => toReal(p) < -1e-6);

            const sim = simulateTimeResponse(ss, currentSignal, Tmax, wc);
            const stepSim = currentSignal === 'step' ? sim : simulateTimeResponse(ss, 'step', Tmax, wc);
            const kpis = computeStepKPIs(stepSim.t, stepSim.y, isConvergent);

            lastTemporalData = { t: sim.t, u: sim.u, y: sim.y, kpis, signal: currentSignal };

            document.getElementById('val-yss').textContent = kpis.yss === null ? t('nd') : kpis.yss.toFixed(3);
            document.getElementById('val-ess').textContent = kpis.ess === null ? t('nd') : kpis.ess.toFixed(3);
            document.getElementById('val-tr').textContent = formatTime(kpis.tr);
            document.getElementById('val-ts').textContent = formatTime(kpis.ts);
            document.getElementById('val-overshoot').textContent = kpis.overshoot === null ? t('nd') : kpis.overshoot.toFixed(1) + '%';

            renderTemporalChart(sim.t, sim.u, sim.y);
        }

        // Draws (or redraws) the temporal response chart: a dashed neutral
        // line for the input signal and a solid indigo/violet line for the
        // system's output — the same palette in both light and dark mode.
        // The Input/Output legend is a custom HTML pill pair (see
        // toggleTemporalDataset), not Chart.js's built-in canvas legend, so
        // it can match the site's rounded-full button styling.
        function renderTemporalChart(tArr, uArr, yArr) {
            const canvas = document.getElementById('temporalChart');
            if (!canvas) return;

            const gridColor = isDarkMode ? '#2a3441' : '#e5e7eb';
            const textColor = isDarkMode ? '#9aa7b8' : '#6b7280';
            const outputColor = isDarkMode ? '#818cf8' : '#6366f1';
            const inputColor = isDarkMode ? '#6b7280' : '#9ca3af';

            // Sync the custom legend pills' colors and default (visible) state.
            const outBtn = document.getElementById('legend-btn-output');
            const inBtn = document.getElementById('legend-btn-input');
            const outDot = document.getElementById('legend-dot-output');
            const inDot = document.getElementById('legend-dot-input');
            if (outBtn) { outBtn.style.setProperty('--legend-color', outputColor); outBtn.classList.add('active'); outBtn.classList.remove('inactive'); }
            if (inBtn) { inBtn.style.setProperty('--legend-color', inputColor); inBtn.classList.add('active'); inBtn.classList.remove('inactive'); }
            if (outDot) outDot.style.backgroundColor = outputColor;
            if (inDot) inDot.style.backgroundColor = inputColor;
            const outLabel = document.getElementById('legend-label-output'); if (outLabel) outLabel.textContent = t('outputLbl');
            const inLabel = document.getElementById('legend-label-input'); if (inLabel) inLabel.textContent = t('inputLbl');

            if (temporalChart) temporalChart.destroy();
            temporalChart = new Chart(canvas.getContext('2d'), {
                type: 'line',
                data: {
                    labels: tArr.map(v => v.toFixed(3)),
                    datasets: [
                        { label: t('outputLbl'), data: yArr, borderColor: outputColor, borderWidth: 2.5, tension: 0.15, pointRadius: 0 },
                        { label: t('inputLbl'), data: uArr, borderColor: inputColor, borderDash: [5, 5], borderWidth: 1.5, tension: 0, pointRadius: 0 }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    interaction: { intersect: false, mode: 'index' },
                    scales: {
                        x: { grid: { color: gridColor }, ticks: { color: textColor, maxTicksLimit: 8, font: { size: 11 } }, title: { display: true, text: 't (s)', color: textColor, font: { size: 12, weight: '600' } } },
                        y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } } }
                    },
                    plugins: {
                        legend: { display: false },
                        zoom: {
                            pan: { enabled: true, mode: 'xy' },
                            zoom: { wheel: { enabled: false }, pinch: { enabled: true }, mode: 'xy' } // wheel requires a click first — see activateChartZoom()
                        }
                    }
                }
            });
            makeChartClickActivatable(temporalChart, canvas);
        }

        // Toggles one dataset (0 = output, 1 = input) on/off, mirroring the
        // visual style of Chart.js's own clickable legend but as real,
        // fully-rounded pill buttons matching the site's design.
        function toggleTemporalDataset(index) {
            if (!temporalChart) return;
            const meta = temporalChart.getDatasetMeta(index);
            meta.hidden = meta.hidden === null ? !temporalChart.data.datasets[index].hidden : !meta.hidden;
            temporalChart.update();
            const btn = document.getElementById(index === 0 ? 'legend-btn-output' : 'legend-btn-input');
            if (btn) btn.classList.toggle('inactive', !!meta.hidden);
        }

        // ── Custom signal dropdown (name + mini waveform SVG + formula) ─────
        const SIGNAL_ORDER = ['step', 'impulse', 'ramp', 'square', 'sine'];
        const SIGNAL_META = {
            step:    { nameKey: 'sigStep',    formula: 'u(t) = 1(t)',
                svg: '<svg viewBox="0 0 60 24" class="w-10 h-6"><path d="M2 20 H22 V4 H58" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
            impulse: { nameKey: 'sigImpulse', formula: 'u(t) = δ(t)',
                svg: '<svg viewBox="0 0 60 24" class="w-10 h-6"><path d="M2 20 H26 L30 3 L34 20 H58" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
            ramp:    { nameKey: 'sigRamp',    formula: 'u(t) = t',
                svg: '<svg viewBox="0 0 60 24" class="w-10 h-6"><path d="M2 22 L58 2" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>' },
            square:  { nameKey: 'sigSquare',  formula: 'u(t) = sgn(sin ωt)',
                svg: '<svg viewBox="0 0 60 24" class="w-10 h-6"><path d="M2 5 H16 V19 H30 V5 H44 V19 H58" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
            sine:    { nameKey: 'sigSine',    formula: 'u(t) = sin(ωc·t)',
                svg: '<svg viewBox="0 0 60 24" class="w-10 h-6"><path d="M2 12 C10 2 16 2 20 12 C24 22 30 22 34 12 C38 2 44 2 48 12 C52 20 55 20 58 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>' }
        };

        // Builds the dropdown's option list from SIGNAL_META (avoids
        // duplicating the waveform SVGs between the button and the menu).
        function buildSignalMenu() {
            const menu = document.getElementById('signal-menu');
            if (!menu) return;
            menu.innerHTML = SIGNAL_ORDER.map(key => {
                const m = SIGNAL_META[key];
                return `<button type="button" onclick="selectSignal('${key}')" class="signal-option w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-stone-100 dark:hover:bg-gray-700 cursor-pointer">
                    <span class="w-10 h-6 flex items-center justify-center text-stone-500 dark:text-gray-400 shrink-0">${m.svg}</span>
                    <span class="min-w-0">
                        <span class="block text-sm font-bold text-stone-800 dark:text-darktext">${t(m.nameKey)}</span>
                        <span class="block text-[11px] text-stone-500 dark:text-gray-400 font-mono">${m.formula}</span>
                    </span>
                </button>`;
            }).join('');
        }

        // Refreshes the dropdown button's icon/name/formula to match currentSignal.
        function updateSignalButtonDisplay() {
            const m = SIGNAL_META[currentSignal];
            const icon = document.getElementById('signal-btn-icon');
            const name = document.getElementById('signal-btn-name');
            const formula = document.getElementById('signal-btn-formula');
            if (icon) icon.innerHTML = m.svg;
            if (name) name.textContent = t(m.nameKey);
            if (formula) formula.textContent = m.formula;
        }

        // Shows/hides the signal dropdown panel.
        function toggleSignalMenu() { document.getElementById('signal-menu').classList.toggle('open'); }

        // Selects a new input signal, refreshes the button display, and
        // re-simulates immediately if a transfer function is already shown.
        function selectSignal(type) {
            currentSignal = type;
            document.getElementById('signal-menu').classList.remove('open');
            updateSignalButtonDisplay();
            if (isInterfaceExpanded && lastFreqDisplay.length) {
                let analysis = null;
                try { analysis = computeTFAnalysis(document.getElementById('tfInput').value); } catch(e) {}
                if (analysis) calculateTemporalResponse(analysis);
            }
        }

        document.addEventListener('click', (e) => {
            const container = document.getElementById('signal-dropdown-container');
            if (container && !container.contains(e.target)) {
                const menu = document.getElementById('signal-menu');
                if (menu) menu.classList.remove('open');
            }
        });

        // ═══════════════════════════════════════════════════════════════════
        // DIAGRAMMA DI NYQUIST
        // ═══════════════════════════════════════════════════════════════════

        // Winding number of a closed polyline around the point (cx, cy):
        // sums the signed angle swept at each step and divides by 2π. This
        // is the standard, robust way to count encirclements numerically
        // (no special-casing needed for how many times the curve crosses
        // any particular ray from the point).
        function windingNumberAround(pts, cx, cy) {
            let total = 0;
            for (let i = 0; i < pts.length - 1; i++) {
                const a1 = Math.atan2(pts[i].y - cy, pts[i].x - cx);
                const a2 = Math.atan2(pts[i + 1].y - cy, pts[i + 1].x - cx);
                let d = a2 - a1;
                while (d > Math.PI) d -= 2 * Math.PI;
                while (d < -Math.PI) d += 2 * Math.PI;
                total += d;
            }
            return total / (2 * Math.PI);
        }

        // Builds the Nyquist contour and its stability indicators from the
        // already-computed Bode sweep (reuses lastFreqRad/lastMagData/
        // lastPhaseData — no need to re-evaluate the transfer function).
        // The contour follows the standard convention (ω sweeping from -∞
        // to +∞): the mirrored branch (ω<0, the complex conjugate) is drawn
        // first, then the positive branch, so the two connect into one
        // continuous curve for the winding-number calculation.
        // Evaluates a polynomial (ascending coefficients) at a complex point
        // via Horner's method.
        function evalPolyAt(coeffsAsc, s) {
            let result = math.complex(0, 0);
            for (let i = coeffsAsc.length - 1; i >= 0; i--) {
                result = math.add(math.multiply(result, s), math.complex(coeffsAsc[i], 0));
            }
            return result;
        }
        function evalTFAt(numC, denC, s) { return math.divide(evalPolyAt(numC, s), evalPolyAt(denC, s)); }

        // When G(s) has a pole at the origin, the Nyquist contour must
        // indent around it with a small semicircle (radius ε) bulging into
        // the right half-plane. Rather than approximating this with a
        // straight line or a hand-derived sweep formula — both were tested
        // and found to give the wrong encirclement count for double (or
        // higher) origin poles — this evaluates the *real* transfer
        // function directly on that semicircle, which is correct by
        // construction for any pole multiplicity.
        function buildOriginIndentation(numC, denC, poles, zeros) {
            const finiteMags = poles.concat(zeros).map(p => cMag(p)).filter(m => m > 1e-9);
            const eps = finiteMags.length ? Math.min(1e-4, Math.min(...finiteMags) * 1e-4) : 1e-6;
            const steps = 200;
            const pts = [];
            for (let k = 0; k <= steps; k++) {
                const theta = -Math.PI / 2 + Math.PI * (k / steps);
                const s = math.complex(eps * Math.cos(theta), eps * Math.sin(theta));
                const g = evalTFAt(numC, denC, s);
                pts.push({ x: g.re, y: g.im });
            }
            return pts;
        }

        function calculateNyquist(analysis) {
            // Nyquist gets its own frequency sweep, scaled to the system's
            // actual pole/zero magnitudes. The fixed global Bode sweep
            // (1e-2 to 1e9 rad/s) doesn't adapt to extreme cases — for a
            // pole at, say, -1e-8, the interesting near-DC transition
            // happens around 1e-8 rad/s, far below that fixed sweep's
            // minimum, so the true curve shape was never even sampled.
            const charMags = analysis.poles.concat(analysis.zeros).map(p => cMag(p)).filter(m => m > 1e-12);
            const wLow = charMags.length ? Math.min(...charMags) * 1e-3 : 1e-3;
            const wHigh = charMags.length ? Math.max(...charMags) * 1e3 : 1e3;
            const decStart = Math.floor(Math.log10(wLow)), decEnd = Math.ceil(Math.log10(wHigh));
            const sweep = [];
            for (let dec = decStart; dec <= decEnd; dec += 0.02) sweep.push(Math.pow(10, dec));

            const posBranch = [], negBranch = [];
            sweep.forEach(w => {
                const g = evalTFAt(analysis.numC, analysis.denC, math.complex(0, w));
                posBranch.push({ x: g.re, y: g.im });
                negBranch.push({ x: g.re, y: -g.im }); // conjugate, for ω<0
            });

            // Full closed contour: ω from -∞ (reversed negative branch) to
            // +∞, indenting around the origin in between when needed.
            const revNeg = negBranch.slice().reverse();
            const fullContour = analysis.gPole > 0
                ? revNeg.concat(buildOriginIndentation(analysis.numC, analysis.denC, analysis.poles, analysis.zeros)).concat(posBranch)
                : revNeg.concat(posBranch);

            const P = analysis.poles.filter(p => toReal(p) > 1e-6).length; // open-loop poles in the right half-plane
            // windingNumberAround returns the mathematical (counterclockwise-
            // positive) winding number; the classical Nyquist criterion's N
            // counts *clockwise* encirclements, hence the sign flip.
            const N = -Math.round(windingNumberAround(fullContour, -1, 0));
            const Z = N + P;
            const stable = closedLoopStability(analysis); // exact verdict (characteristic-polynomial roots), shown as the definitive badge

            let minDist = Infinity;
            fullContour.forEach(pt => { minDist = Math.min(minDist, Math.hypot(pt.x + 1, pt.y)); });

            const fullBounds = computeNyquistBounds(posBranch, negBranch);
            const initBounds = computeNyquistInitialView(posBranch);
            lastNyquistData = { posBranch, negBranch, P, N, Z, minDist, stable, fullBounds, initBounds };

            document.getElementById('val-nyquist-p').textContent = P;
            document.getElementById('val-nyquist-n').textContent = N;
            document.getElementById('val-nyquist-z').textContent = Z;
            document.getElementById('val-nyquist-dist').textContent = isFinite(minDist) ? minDist.toPrecision(3) : t('nd');

            const stEl = document.getElementById('val-nyquist-stability');
            stEl.textContent = stable ? t('stable') : t('unstable');
            stEl.className = 'text-sm font-bold uppercase tracking-wide px-2.5 py-1 rounded-md inline-block mt-1 ' + (stable
                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400');

            renderNyquistChart(posBranch, negBranch, initBounds, fullBounds);
        }

        // The full data-driven bounding box (every plotted point + 12%
        // margin) — used only as the outer pan/zoom limit, so the complete
        // curve is always reachable by zooming out, exactly like MATLAB's
        // nyquist(). No longer forces the critical point into the frame:
        // that was harmless for huge curves but unnecessary, and this box
        // is not what's shown by default (see computeNyquistInitialView).
        function computeNyquistBounds(posBranch, negBranch) {
            let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
            posBranch.concat(negBranch).forEach(p => {
                if (!isFinite(p.x) || !isFinite(p.y)) return;
                if (p.x < xMin) xMin = p.x;
                if (p.x > xMax) xMax = p.x;
                if (p.y < yMin) yMin = p.y;
                if (p.y > yMax) yMax = p.y;
            });
            if (!isFinite(xMin) || !isFinite(xMax)) { xMin = -3; xMax = 3; }
            if (!isFinite(yMin) || !isFinite(yMax)) { yMin = -3; yMax = 3; }
            const marginX = Math.max((xMax - xMin) * 0.12, 0.5);
            const marginY = Math.max((yMax - yMin) * 0.12, 0.5);
            return { xMin: xMin - marginX, xMax: xMax + marginX, yMin: yMin - marginY, yMax: yMax + marginY };
        }

        // The default view shown when the diagram is first drawn: based on
        // the MEDIAN magnitude of the curve rather than its full extent, so
        // it stays immediately legible even when a very small (or very
        // large) pole/zero makes the full curve span many orders of
        // magnitude — without this, systems like that required a lot of
        // manual zooming just to see anything.
        // The default view shown when the diagram is first drawn. The
        // stability-relevant part of ANY Nyquist curve (the crossings near
        // the critical point -1+j0) always lives in a small, predictable
        // window around the origin — regardless of how extreme the
        // system's poles/zeros are elsewhere in frequency. A percentile/
        // median-based heuristic was still fragile (some systems still
        // needed a lot of manual zooming), so this uses a fixed, always-
        // consistent default window instead, matching what tools like
        // Wolfram Alpha or MATLAB show immediately for any system. Only
        // falls back to a computed window for the rare pathological case
        // where the curve never comes anywhere near that default at all
        // (e.g. an extremely low- or high-gain system).
        function computeNyquistInitialView(posBranch) {
            const DEFAULT_BOUND = 5;
            const mags = posBranch.map(p => Math.hypot(p.x, p.y)).filter(m => isFinite(m));
            const hasNearbyPoint = mags.some(m => m < DEFAULT_BOUND * 1.5);
            if (hasNearbyPoint || !mags.length) {
                return { xMin: -DEFAULT_BOUND, xMax: DEFAULT_BOUND, yMin: -DEFAULT_BOUND, yMax: DEFAULT_BOUND };
            }
            // Curve never approaches the default window: center on whichever
            // point's magnitude is closest to 1 (the crossover-like region).
            let bestMag = mags[0], bestDiff = Infinity;
            mags.forEach(m => {
                const d = Math.abs(Math.log10(m || 1e-12));
                if (d < bestDiff) { bestDiff = d; bestMag = m; }
            });
            const bound = Math.max(bestMag * 3, DEFAULT_BOUND);
            return { xMin: -bound, xMax: bound, yMin: -bound, yMax: bound };
        }

        // Draws (or redraws) the Nyquist chart: solid curve for ω>0, a
        // lighter dashed mirror for ω<0, and a marked critical point (-1,0).
        // Opens on the compact `initBounds` view; zooming out is limited to
        // `fullBounds` (the complete curve), never further.
        function renderNyquistChart(posBranch, negBranch, initBounds, fullBounds) {
            const canvas = document.getElementById('nyquistChart');
            if (!canvas) return;
            const gridColor = isDarkMode ? '#2a3441' : '#e5e7eb';
            const textColor = isDarkMode ? '#9aa7b8' : '#6b7280';
            const curveColor = isDarkMode ? '#818cf8' : '#6366f1';
            const mirrorColor = isDarkMode ? '#6b7280' : '#9ca3af';
            const criticalColor = isDarkMode ? '#f87171' : '#dc2626';

            if (nyquistChart) nyquistChart.destroy();
            nyquistChart = new Chart(canvas.getContext('2d'), {
                type: 'line',
                data: {
                    datasets: [
                        { label: 'ω > 0', data: posBranch, borderColor: curveColor, borderWidth: 2.5, pointRadius: 0, showLine: true, tension: 0 },
                        { label: 'ω < 0', data: negBranch, borderColor: mirrorColor, borderDash: [5, 5], borderWidth: 1.5, pointRadius: 0, showLine: true, tension: 0 },
                        { label: '-1 + j0', data: [{ x: -1, y: 0 }], borderColor: criticalColor, backgroundColor: criticalColor, pointRadius: 6, pointStyle: 'crossRot', pointBorderWidth: 3, showLine: false }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    interaction: { intersect: false },
                    scales: {
                        x: { type: 'linear', min: initBounds.xMin, max: initBounds.xMax, grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } }, title: { display: true, text: 'Re', color: textColor, font: { size: 12, weight: '600' } } },
                        y: { type: 'linear', min: initBounds.yMin, max: initBounds.yMax, grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } }, title: { display: true, text: 'Im', color: textColor, font: { size: 12, weight: '600' } } }
                    },
                    plugins: {
                        legend: { display: false },
                        zoom: {
                            limits: { x: { min: fullBounds.xMin, max: fullBounds.xMax }, y: { min: fullBounds.yMin, max: fullBounds.yMax } },
                            pan: { enabled: true, mode: 'xy' },
                            zoom: {
                                wheel: { enabled: false }, // requires a click on the chart first — see activateChartZoom()
                                pinch: { enabled: true }, mode: 'xy'
                            }
                        }
                    }
                }
            });
            makeChartClickActivatable(nyquistChart, canvas);
        }

        // Restores the Nyquist chart to its initial suggested view.
        function resetNyquistZoom() {
            if (nyquistChart && typeof nyquistChart.resetZoom === 'function') nyquistChart.resetZoom();
        }

        // ── X-axis tick formatter: only powers of 10, shown as 10ⁿ ──────────
        const SUPERSCRIPTS = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
        // Converts a number (or string of digits) into unicode superscript characters, e.g. '23' -> '²³'.
        function toSuperscript(n) { return String(n).split('').map(c => SUPERSCRIPTS[c] || c).join(''); }
        // Chart.js tick-formatting callback: only labels ticks that are exact powers of 10, in '10ⁿ' exponential notation.
        function xTickCallback(value) {
            const exp = Math.round(Math.log10(value));
            if (Math.abs(Math.pow(10, exp) - value) / (value || 1) < 0.01) {
                return '10' + toSuperscript(exp);
            }
            return '';
        }

        // ── Generate Bode ─────────────────────────────────────────────────────
        // mathjs's complex.toPolar() returns the *wrapped* principal angle,
        // always in (-180°, 180°]. For systems whose true phase drops past
        // -180° (any order-3+ system, or lower relative degree with enough
        // phase lag), the wrapped value jumps back up near +180° instead of
        // continuing down — which hides the real -180° crossing entirely and
        // makes the computed Gain Margin come out as "∞" even when the
        // system is actually unstable. Unwrap the sampled phase sequence so
        // it is continuous before using it for anything (plotting, margins).
        // Removes artificial ±360° jumps from a sequence of wrapped (-180°,180°] phase samples so the curve is continuous — needed because mathjs's toPolar() always returns the wrapped principal angle, which would otherwise hide the true -180° crossing (and gain margin) for systems whose phase drops past -180°.
        function unwrapPhaseDeg(arr) {
            const out = [];
            let offset = 0, prevRaw = null;
            for (let i = 0; i < arr.length; i++) {
                const v = arr[i];
                if (v === null) { out.push(null); prevRaw = null; continue; }
                if (prevRaw !== null) {
                    const diff = v - prevRaw;
                    if (diff > 180) offset -= 360;
                    else if (diff < -180) offset += 360;
                }
                out.push(v + offset);
                prevRaw = v;
            }
            return out;
        }

        // Samples the transfer function across the whole frequency sweep, builds the real/asymptotic/contribution curves, and triggers the chart and parameter-panel rendering.
        function generateBode() {
            const exprStr = document.getElementById('tfInput').value;
            let code;
            try { code = math.compile(exprStr); } catch(e) { return; }

            let analysis = null;
            try { analysis = computeTFAnalysis(exprStr); } catch(e) {}

            let magData = [], phaseData = [], freqRad = [], freqDisplay = [];
            frequenciesHz.forEach(f => {
                let w = f * 2 * Math.PI;
                freqRad.push(w);
                freqDisplay.push(currentUnit === 'Hz' ? f : w);
                try {
                    const s = math.complex(0, w);
                    const res = code.evaluate({ s });
                    const polar = (res && res.toPolar) ? res.toPolar() : { r: cMag(res), phi: 0 };
                    magData.push(20 * Math.log10(polar.r));
                    phaseData.push(polar.phi * (180 / Math.PI));
                } catch(e) { magData.push(null); phaseData.push(null); }
            });
            phaseData = unwrapPhaseDeg(phaseData);

            let asympMagData = [], asympPhaseData = [], contributionCurves = [];

            if (analysis) {
                let poleGroups = groupRoots(analysis.poles);
                let zeroGroups = groupRoots(analysis.zeros);
                let startLevel = magData[0] !== null ? magData[0] : 0;

                asympMagData = buildAsymptoticCurve(poleGroups, zeroGroups, analysis.gPole, analysis.gZero, freqRad, startLevel);
                asympPhaseData = buildAsymptoticPhase(poleGroups, zeroGroups, analysis.gPole, analysis.gZero, freqRad);
                contributionCurves = buildContributionCurves(analysis, freqRad);

                lastFreqDisplay = freqDisplay;
                lastFreqRad = freqRad;
                lastMagData = magData;
                lastPhaseData = phaseData;
                lastAsympMagData = asympMagData;
                lastAsympPhaseData = asympPhaseData;

                updateParameterPanel(analysis, freqRad, freqDisplay, magData, phaseData);
                try { calculateTemporalResponse(analysis); } catch(e) { console.error('Temporal response error:', e); }
                try { calculateNyquist(analysis); } catch(e) { console.error('Nyquist error:', e); }
            }

            lastContributionCurves = contributionCurves;

            renderContributionsMenu(contributionCurves);
            renderCharts(freqDisplay, magData, phaseData, asympMagData, asympPhaseData, contributionCurves);
        }

        // ── Render Charts ─────────────────────────────────────────────────────
        // Assembles the Chart.js dataset arrays (real curve, asymptotes, individual contributions) according to which visualization layers are currently active.
        // Builds the dataset array for one chart (magnitude or phase) using
        // the given layer-visibility state — factored out so the mini-docks
        // can rebuild just one chart independently of the other.
        function buildDatasetsForChart(magData, phaseData, asympMagData, asympPhaseData, contributionCurves, layers, isPhase, visibilityMap) {
            contributionCurves = contributionCurves || [];
            visibilityMap = visibilityMap || contributionVisibility;
            const datasets = [];
            const mainData = isPhase ? phaseData : magData;
            const asympData = isPhase ? asympPhaseData : asympMagData;
            const unitLabel = isPhase ? ' (°)' : ' (dB)';
            const dataKey = isPhase ? 'dataPhase' : 'dataMag';
            const asympKey = isPhase ? 'dataPhaseAsymp' : 'dataMagAsymp';

            if (layers.real) {
                const realColor = isDarkMode ? '#f5efe0' : '#000000';
                datasets.push({ label: t('real') + unitLabel, data: mainData, borderColor: realColor, borderWidth: 2, tension: 0.4, pointRadius: 0 });
            }
            if (layers.asymptotic) {
                datasets.push({ label: t('asymp') + unitLabel, data: asympData, borderColor: '#10b981', borderDash: [5, 5], borderWidth: 2, pointRadius: 0 });
            }
            if (layers.contributions) {
                contributionCurves.forEach(c => {
                    if (visibilityMap[c.id] === false) return;
                    if (layers.real) datasets.push({ data: c[dataKey], borderColor: c.color, borderWidth: 1.5, pointRadius: 0, tension: 0.4 });
                    if (layers.asymptotic && c[asympKey]) datasets.push({ data: c[asympKey], borderColor: c.color, borderDash: [4, 4], borderWidth: 1, pointRadius: 0, tension: 0 });
                });
            }
            return datasets;
        }

        function buildChartDatasets(magData, phaseData, asympMagData, asympPhaseData, contributionCurves, magLayers, phaseLayers, magVisibility, phaseVisibility) {
            magLayers = magLayers || activeLayersMag;
            phaseLayers = phaseLayers || activeLayersPhase;
            magVisibility = magVisibility || contributionVisibilityMag;
            phaseVisibility = phaseVisibility || contributionVisibilityPhase;
            const datasetsMag = buildDatasetsForChart(magData, phaseData, asympMagData, asympPhaseData, contributionCurves, magLayers, false, magVisibility);
            const datasetsPhase = buildDatasetsForChart(magData, phaseData, asympMagData, asympPhaseData, contributionCurves, phaseLayers, true, phaseVisibility);
            return { datasetsMag, datasetsPhase };
        }

        // Draws (or redraws) the magnitude and phase Chart.js charts with the current data, colors and axis settings.
        function renderCharts(labels, magData, phaseData, asympMagData, asympPhaseData, contributionCurves) {
            const magCanvas = document.getElementById('magnitudeChart');
            const phaseCanvas = document.getElementById('phaseChart');
            const magCtx = magCanvas.getContext('2d');
            const phaseCtx = phaseCanvas.getContext('2d');

            // A fresh calculation resets each chart's individual mini-dock
            // override back to whatever the shared floating dock shows.
            activeLayersMag = { ...activeLayers };
            activeLayersPhase = { ...activeLayers };
            contributionVisibilityMag = { ...contributionVisibility };
            contributionVisibilityPhase = { ...contributionVisibility };
            updateMiniDockUI('mag');
            updateMiniDockUI('phase');
            renderMiniContribPills('mag');
            renderMiniContribPills('phase');

            let gridColor = isDarkMode ? '#2a3441' : '#e5e7eb';
            let textColor = isDarkMode ? '#9aa7b8' : '#6b7280';

            const { datasetsMag, datasetsPhase } = buildChartDatasets(magData, phaseData, asympMagData, asympPhaseData, contributionCurves, activeLayersMag, activeLayersPhase);

            const isMobile = window.innerWidth < 640;
            const axisFontSize = isMobile ? 10 : 15;
            const axisTitleFontSize = isMobile ? 10 : 15;
            const xUnitLabel = currentUnit === 'Hz' ? 'Hz' : 'rad/s';

            // Builds a Chart.js options object (axes, grid, fonts, units) for one chart given its Y-axis label ('dB' or '°').
            function makeChartOptions(yLabel) {
                return {
                    responsive: true, maintainAspectRatio: false,
                    layout: { padding: { left: isMobile ? 2 : 6, right: isMobile ? 6 : 12, top: isMobile ? 2 : 8, bottom: isMobile ? 2 : 6 } },
                    scales: {
                        x: {
                            type: 'logarithmic', grid: { color: gridColor },
                            title: { display: true, text: xUnitLabel, color: textColor, font: { size: axisTitleFontSize, weight: '600' }, padding: { top: isMobile ? 2 : 6 } },
                            ticks: { color: textColor, maxTicksLimit: isMobile ? 7 : 12, font: { size: axisFontSize }, callback: xTickCallback }
                        },
                        y: {
                            grid: { color: gridColor },
                            ticks: { color: textColor, font: { size: axisFontSize } },
                            title: { display: true, text: yLabel, color: textColor, font: { size: axisTitleFontSize, weight: '600' } }
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                };
            }

            if (magChart) magChart.destroy();
            magChart = new Chart(magCtx, { type: 'line', data: { labels, datasets: datasetsMag }, options: makeChartOptions('dB') });

            if (phaseChart) phaseChart.destroy();
            phaseChart = new Chart(phaseCtx, { type: 'line', data: { labels, datasets: datasetsPhase }, options: makeChartOptions('°') });
        }

        let resizeRedrawTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeRedrawTimeout);
            resizeRedrawTimeout = setTimeout(() => {
                if (isInterfaceExpanded && lastFreqDisplay.length) {
                    renderCharts(lastFreqDisplay, lastMagData, lastPhaseData, lastAsympMagData, lastAsympPhaseData, lastContributionCurves);
                }
            }, 250);
        });

        // Renders a chart off-screen at a fixed size and fixed font, independent of the current device — this is what makes the exported PDF look identical whether it's generated from a phone, a tablet or a desktop.
        function renderExportChart(datasets, yLabel) {
            const FW = 1600, FH = 720;
            const off = document.createElement('canvas');
            off.width = FW; off.height = FH;
            off.style.position = 'fixed'; off.style.left = '-99999px';
            document.body.appendChild(off);

            const gridColor = isDarkMode ? '#2a3441' : '#e5e7eb';
            const textColor = isDarkMode ? '#9aa7b8' : '#6b7280';
            const bgColor = isDarkMode ? '#0b0f17' : '#fdfbf7';
            const xUnitLabel = currentUnit === 'Hz' ? 'Hz' : 'rad/s';

            const chart = new Chart(off.getContext('2d'), {
                type: 'line',
                data: { labels: lastFreqDisplay, datasets },
                options: {
                    // devicePixelRatio must be pinned to 1: left at its default,
                    // Chart.js multiplies the canvas by the device's screen DPR
                    // (up to 3-4x on phones), squaring the pixel count and
                    // producing enormous, poorly-compressing export images —
                    // this alone was the main cause of 100MB+ PDFs.
                    devicePixelRatio: 1,
                    responsive: false, maintainAspectRatio: false, animation: false,
                    layout: { padding: { left: 10, right: 20, top: 12, bottom: 10 } },
                    scales: {
                        x: { type: 'logarithmic', grid: { color: gridColor }, title: { display: true, text: xUnitLabel, color: textColor, font: { size: 20, weight: '600' } }, ticks: { color: textColor, maxTicksLimit: 12, font: { size: 18 }, callback: xTickCallback } },
                        y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 18 } }, title: { display: true, text: yLabel, color: textColor, font: { size: 20, weight: '600' } } }
                    },
                    plugins: { legend: { display: false } }
                },
                plugins: [{
                    // JPEG has no transparency, so paint a solid background
                    // behind the chart before it's exported.
                    id: 'solidBg',
                    beforeDraw(c) {
                        const { ctx, width, height } = c;
                        ctx.save();
                        ctx.globalCompositeOperation = 'destination-over';
                        ctx.fillStyle = bgColor;
                        ctx.fillRect(0, 0, width, height);
                        ctx.restore();
                    }
                }]
            });
            // JPEG at high quality is dramatically smaller than lossless PNG
            // for this kind of content (dense anti-aliased/dashed lines) and
            // is visually indistinguishable in a printed report.
            const img = chart.toBase64Image('image/jpeg', 0.92);
            chart.destroy();
            document.body.removeChild(off);
            return { img, w: FW, h: FH };
        }

        // Renders the temporal response chart off-screen at a fixed size/font
        // for the PDF, exactly like renderExportChart does for the Bode plots.
        function renderExportTemporalChart() {
            if (!lastTemporalData) return null;
            const { t: tArr, u, y } = lastTemporalData;
            const FW = 1600, FH = 720;
            const off = document.createElement('canvas');
            off.width = FW; off.height = FH;
            off.style.position = 'fixed'; off.style.left = '-99999px';
            document.body.appendChild(off);

            const gridColor = isDarkMode ? '#2a3441' : '#e5e7eb';
            const textColor = isDarkMode ? '#9aa7b8' : '#6b7280';
            const bgColor = isDarkMode ? '#0b0f17' : '#fdfbf7';
            const outputColor = isDarkMode ? '#818cf8' : '#6366f1';
            const inputColor = isDarkMode ? '#6b7280' : '#9ca3af';

            const chart = new Chart(off.getContext('2d'), {
                type: 'line',
                data: {
                    labels: tArr.map(v => v.toFixed(3)),
                    datasets: [
                        { label: t('outputLbl'), data: y, borderColor: outputColor, borderWidth: 3, tension: 0.15, pointRadius: 0 },
                        { label: t('inputLbl'), data: u, borderColor: inputColor, borderDash: [10, 10], borderWidth: 2, tension: 0, pointRadius: 0 }
                    ]
                },
                options: {
                    devicePixelRatio: 1,
                    responsive: false, maintainAspectRatio: false, animation: false,
                    layout: { padding: { left: 10, right: 20, top: 12, bottom: 10 } },
                    scales: {
                        x: { grid: { color: gridColor }, ticks: { color: textColor, maxTicksLimit: 10, font: { size: 16 } }, title: { display: true, text: 't (s)', color: textColor, font: { size: 18, weight: '600' } } },
                        y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 16 } } }
                    },
                    plugins: { legend: { display: true, position: 'top', align: 'end', labels: { color: textColor, boxWidth: 24, font: { size: 16 } } } }
                },
                plugins: [{
                    id: 'solidBg',
                    beforeDraw(c) {
                        const { ctx, width, height } = c;
                        ctx.save();
                        ctx.globalCompositeOperation = 'destination-over';
                        ctx.fillStyle = bgColor;
                        ctx.fillRect(0, 0, width, height);
                        ctx.restore();
                    }
                }]
            });
            const img = chart.toBase64Image('image/jpeg', 0.92);
            chart.destroy();
            document.body.removeChild(off);
            return { img, w: FW, h: FH };
        }

        // Renders the Nyquist chart off-screen at a fixed size/font for the PDF.
        function renderExportNyquistChart() {
            if (!lastNyquistData) return null;
            const { posBranch, negBranch, fullBounds } = lastNyquistData;
            // Reflect whatever zoom/pan the user currently has on the live
            // chart (chartjs-plugin-zoom updates chart.scales in place), so
            // the PDF matches exactly what they were looking at — falls back
            // to the full bounding box if the live chart isn't available.
            const bounds = (nyquistChart && nyquistChart.scales && nyquistChart.scales.x && nyquistChart.scales.y)
                ? { xMin: nyquistChart.scales.x.min, xMax: nyquistChart.scales.x.max, yMin: nyquistChart.scales.y.min, yMax: nyquistChart.scales.y.max }
                : fullBounds;
            const FW = 1600, FH = 900;
            const off = document.createElement('canvas');
            off.width = FW; off.height = FH;
            off.style.position = 'fixed'; off.style.left = '-99999px';
            document.body.appendChild(off);

            const gridColor = isDarkMode ? '#2a3441' : '#e5e7eb';
            const textColor = isDarkMode ? '#9aa7b8' : '#6b7280';
            const bgColor = isDarkMode ? '#0b0f17' : '#fdfbf7';
            const curveColor = isDarkMode ? '#818cf8' : '#6366f1';
            const mirrorColor = isDarkMode ? '#6b7280' : '#9ca3af';
            const criticalColor = isDarkMode ? '#f87171' : '#dc2626';

            const chart = new Chart(off.getContext('2d'), {
                type: 'line',
                data: {
                    datasets: [
                        { data: posBranch, borderColor: curveColor, borderWidth: 3, pointRadius: 0, showLine: true, tension: 0 },
                        { data: negBranch, borderColor: mirrorColor, borderDash: [10, 10], borderWidth: 2, pointRadius: 0, showLine: true, tension: 0 },
                        { data: [{ x: -1, y: 0 }], borderColor: criticalColor, backgroundColor: criticalColor, pointRadius: 9, pointStyle: 'crossRot', pointBorderWidth: 4, showLine: false }
                    ]
                },
                options: {
                    devicePixelRatio: 1,
                    responsive: false, maintainAspectRatio: false, animation: false,
                    layout: { padding: { left: 10, right: 20, top: 12, bottom: 10 } },
                    scales: {
                        x: { type: 'linear', min: bounds.xMin, max: bounds.xMax, grid: { color: gridColor }, ticks: { color: textColor, font: { size: 16 } }, title: { display: true, text: 'Re', color: textColor, font: { size: 18, weight: '600' } } },
                        y: { type: 'linear', min: bounds.yMin, max: bounds.yMax, grid: { color: gridColor }, ticks: { color: textColor, font: { size: 16 } }, title: { display: true, text: 'Im', color: textColor, font: { size: 18, weight: '600' } } }
                    },
                    plugins: { legend: { display: false } }
                },
                plugins: [{
                    id: 'solidBg',
                    beforeDraw(c) {
                        const { ctx, width, height } = c;
                        ctx.save();
                        ctx.globalCompositeOperation = 'destination-over';
                        ctx.fillStyle = bgColor;
                        ctx.fillRect(0, 0, width, height);
                        ctx.restore();
                    }
                }]
            });
            const img = chart.toBase64Image('image/jpeg', 0.92);
            chart.destroy();
            document.body.removeChild(off);
            return { img, w: FW, h: FH };
        }

        // Builds and downloads a clean PDF report (formula, the 3 data cards, both charts) using jsPDF directly, without screenshotting the page.
        function downloadPDF() {
            const jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
            if (!jsPDFCtor) { console.error('jsPDF non disponibile'); return; }

            const doc = new jsPDFCtor({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const marginX = 15;
            const usableW = pageW - marginX * 2;
            let y = 28;

            const textDark = [28, 25, 23], textGray = [107, 114, 128], ruleGray = [225, 220, 210], accent = [30, 58, 138];
            const setC = c => doc.setTextColor(c[0], c[1], c[2]);
            const setD = c => doc.setDrawColor(c[0], c[1], c[2]);

            // Adds a new PDF page if the next block of content wouldn't fit on the remainder of the current one.
            function ensureSpace(h) { if (y + h > pageH - 15) { doc.addPage(); y = 28; } }

            // jsPDF's built-in fonts only cover the Latin-1 (WinAnsi) character
            // set; glyphs like 𝜔, ∞, ≈ render broken — swap in safe equivalents.
            // Strips or replaces characters not supported by jsPDF's standard Latin-1 font (e.g. 𝜔, ∞, ≈), which would otherwise render as broken glyphs.
            function pdfSafe(str) {
                if (!str) return str;
                return String(str).replace(/𝜔/g, 'w').replace(/ω/g, 'w').replace(/∞/g, 'inf').replace(/≈/g, '~').replace(/[^\x00-\xFF]/g, '');
            }
            // Reads and PDF-sanitizes the text content of a DOM element, for use in the PDF report.
            function getText(id) {
                const el = document.getElementById(id);
                return pdfSafe(el ? el.textContent.trim() : '');
            }
            // Title + thin rule, shared by the data cards and the chart blocks.
            // Draws a section title followed by a thin divider rule — the shared header style for both the data cards and the chart blocks in the PDF.
            function sectionHeader(title, color, size) {
                doc.setFont('helvetica', 'bold'); doc.setFontSize(size); setC(color);
                doc.text(title.toUpperCase(), marginX, y + 3);
                setD(ruleGray); doc.setLineWidth(0.2);
                doc.line(marginX, y + 6, marginX + usableW, y + 6);
            }

            // ── Header ───────────────────────────────────────────────
            doc.setFont('helvetica', 'bold'); doc.setFontSize(17); setC(textDark);
            doc.text('Easy Bode - Analisi di Bode', marginX, y);
            y += 11;

            // ── Formula G(s) — drawn as real vector text, exponents as true
            //    raised/smaller glyphs (unicode superscripts past ¹²³ are
            //    missing from jsPDF's standard font) ─────────────────────
            const exprStr = document.getElementById('tfInput').value || '';
            let numStr = '1', denStr = '1';
            if (exprStr.indexOf('/') !== -1) {
                const parts = exprStr.split('/');
                numStr = parts[0] || '1'; denStr = parts[1] || '1';
            } else if (exprStr.trim() !== '') { numStr = exprStr; denStr = '1'; }

            const cleanExpr = str => str.trim().replace(/\*/g, '');
            // Splits an expression string into normal-text and superscript (exponent) segments, for rendering true vector superscripts in the PDF.
            function parseExprSegments(str) {
                const segments = []; const re = /\^(-?\d+)/g; let lastIndex = 0, m;
                while ((m = re.exec(str)) !== null) {
                    if (m.index > lastIndex) segments.push({ text: str.slice(lastIndex, m.index), sup: false });
                    segments.push({ text: m[1], sup: true });
                    lastIndex = re.lastIndex;
                }
                if (lastIndex < str.length) segments.push({ text: str.slice(lastIndex), sup: false });
                return segments;
            }
            // Measures the total rendered width of an expression in the PDF, accounting for the smaller size of superscript segments.
            function measureExpr(str, fontSize) {
                let w = 0;
                parseExprSegments(str).forEach(seg => {
                    doc.setFont('times', 'italic'); doc.setFontSize(seg.sup ? fontSize * 0.62 : fontSize);
                    w += doc.getTextWidth(seg.text);
                });
                return w;
            }
            // Draws an expression horizontally centered on a point, rendering exponents as true raised/smaller vector text instead of unicode superscript characters.
            function drawExprCentered(str, centerX, baselineY, fontSize) {
                const segments = parseExprSegments(str);
                let cursorX = centerX - measureExpr(str, fontSize) / 2;
                segments.forEach(seg => {
                    doc.setFont('times', 'italic'); doc.setFontSize(seg.sup ? fontSize * 0.62 : fontSize);
                    doc.text(seg.text, cursorX, seg.sup ? baselineY - fontSize * 0.30 * 0.3528 : baselineY);
                    cursorX += doc.getTextWidth(seg.text);
                });
            }
            numStr = cleanExpr(numStr); denStr = cleanExpr(denStr);

            const formulaFontSize = 15, fsMm = formulaFontSize * 0.3528;
            // Vertical gap from the bar to each baseline, sized to the font's
            // approximate ascent/descent so glyphs never cross the bar line.
            const numGap = fsMm * 0.45, denGap = fsMm * 1.00;
            const topClearance = fsMm * 0.85, bottomClearance = fsMm * 0.35;
            const formulaH = numGap + topClearance + denGap + bottomClearance;
            ensureSpace(formulaH + 10);

            doc.setFont('helvetica', 'normal'); doc.setFontSize(11); setC(textGray);
            const barY = y + topClearance + numGap;
            doc.text('G(s) =', marginX, barY, { baseline: 'middle' });

            const fracCenterX = marginX + 26 + Math.max(measureExpr(numStr, formulaFontSize), measureExpr(denStr, formulaFontSize)) / 2;
            const barHalf = Math.max(measureExpr(numStr, formulaFontSize), measureExpr(denStr, formulaFontSize)) / 2 + 2.5;
            setC(textDark);
            drawExprCentered(numStr, fracCenterX, barY - numGap, formulaFontSize);
            setD(textDark); doc.setLineWidth(0.35);
            doc.line(fracCenterX - barHalf, barY, fracCenterX + barHalf, barY);
            drawExprCentered(denStr, fracCenterX, barY + denGap, formulaFontSize);
            y += formulaH + 10;

            // ── The 3 data cards (values read straight from the computed UI) ─
            // Minimal design: no boxes — a title, a thin rule, and the rows.
            const cardDefs = [
                { title: 'lbl-w2-title', rows: [['lbl-static-gain', 'val-static-gain'], ['lbl-sys-type', 'val-sys-type'], ['lbl-sys-order', 'val-sys-order'], ['lbl-extracted-zeros-title', 'val-extracted-zeros'], ['lbl-extracted-poles-title', 'val-extracted-poles']] },
                { title: 'lbl-w1-title', rows: [['lbl-pm', 'val-pm'], ['lbl-wc', 'val-wc'], ['lbl-gm', 'val-gm'], ['lbl-w180', 'val-w180'], ['lbl-cl-stability', 'val-cl-stability']] },
                { title: 'lbl-w3-title', rows: [['lbl-resonance-peak', 'val-resonance-peak'], ['lbl-slope-init', 'val-slope-init'], ['lbl-slope-final', 'val-slope-final'], ['lbl-bandwidth', 'val-bandwidth'], ['lbl-filter-behavior', 'val-filter-behavior']] }
            ];
            cardDefs.forEach(card => {
                const rowH = 6.4, cardH = 9 + card.rows.length * rowH;
                ensureSpace(cardH + 8);
                sectionHeader(getText(card.title), accent, 10.5);
                let ry = y + 13;
                card.rows.forEach(([labelId, valueId]) => {
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); setC(textGray);
                    doc.text(getText(labelId), marginX, ry);
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); setC(textDark);
                    doc.text(getText(valueId) || '--', marginX + usableW, ry, { align: 'right' });
                    ry += rowH;
                });
                y += cardH + 8;
            });

            // ── The 2 charts, rendered off-screen at a fixed size so the ─
            // PDF looks identical regardless of the device used to make it.
            // Adds one chart's title, divider rule and exported image to the PDF, starting a new page first if it wouldn't fit.
            function addChartImage(datasets, yLabel, titleId) {
                if (!datasets.length || !lastFreqDisplay.length) return;
                const { img, w, h } = renderExportChart(datasets, yLabel);
                const drawW = usableW, drawH = drawW * (h / w);
                ensureSpace(drawH + 16);
                sectionHeader(getText(titleId), textGray, 10);
                y += 10;
                doc.addImage(img, 'JPEG', marginX, y, drawW, drawH);
                y += drawH + 20;
            }
            const { datasetsMag, datasetsPhase } = buildChartDatasets(lastMagData, lastPhaseData, lastAsympMagData, lastAsympPhaseData, lastContributionCurves);
            addChartImage(datasetsMag, 'dB', 'title-mag');
            addChartImage(datasetsPhase, '°', 'title-phase');

            // ── Temporal response chart + KPI table ──────────────────────
            if (lastTemporalData) {
                const exp = renderExportTemporalChart();
                if (exp) {
                    const drawW = usableW, drawH = drawW * (exp.h / exp.w);
                    ensureSpace(drawH + 16);
                    sectionHeader(getText('lbl-temporal-title'), textGray, 10);
                    y += 10;
                    doc.addImage(exp.img, 'JPEG', marginX, y, drawW, drawH);
                    y += drawH + 12;
                }

                const kpiRows = [
                    ['lbl-overshoot', 'val-overshoot'],
                    ['lbl-yss', 'val-yss'],
                    ['lbl-ess', 'val-ess'],
                    ['lbl-tr', 'val-tr'],
                    ['lbl-ts', 'val-ts']
                ];
                const kpiRowH = 6.4, kpiCardH = 9 + kpiRows.length * kpiRowH;
                ensureSpace(kpiCardH + 8);
                sectionHeader(getText('lbl-temporal-title') + ' — KPI', accent, 10.5);
                let kpiRy = y + 13;
                kpiRows.forEach(([labelId, valueId]) => {
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); setC(textGray);
                    doc.text(getText(labelId), marginX, kpiRy);
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); setC(textDark);
                    doc.text(getText(valueId) || '--', marginX + usableW, kpiRy, { align: 'right' });
                    kpiRy += kpiRowH;
                });
                y += kpiCardH + 8;
            }

            // ── Nyquist diagram + parameters ─────────────────────────────
            if (lastNyquistData) {
                const nyqExp = renderExportNyquistChart();
                if (nyqExp) {
                    const drawW = usableW, drawH = drawW * (nyqExp.h / nyqExp.w);
                    ensureSpace(drawH + 16);
                    sectionHeader(getText('lbl-nyquist-title'), textGray, 10);
                    y += 10;
                    doc.addImage(nyqExp.img, 'JPEG', marginX, y, drawW, drawH);
                    y += drawH + 12;
                }

                const nyqRows = [
                    ['lbl-nyquist-stability', 'val-nyquist-stability'],
                    ['lbl-nyquist-p', 'val-nyquist-p'],
                    ['lbl-nyquist-n', 'val-nyquist-n'],
                    ['lbl-nyquist-z', 'val-nyquist-z'],
                    ['lbl-nyquist-dist', 'val-nyquist-dist']
                ];
                const nyqRowH = 6.4, nyqCardH = 9 + nyqRows.length * nyqRowH;
                ensureSpace(nyqCardH + 8);
                sectionHeader(getText('lbl-nyquist-title'), accent, 10.5);
                let nyqRy = y + 13;
                nyqRows.forEach(([labelId, valueId]) => {
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); setC(textGray);
                    doc.text(getText(labelId), marginX, nyqRy);
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); setC(textDark);
                    doc.text(getText(valueId) || '--', marginX + usableW, nyqRy, { align: 'right' });
                    nyqRy += nyqRowH;
                });
                y += nyqCardH + 8;
            }

            doc.save('Bode_Analysis.pdf');
        }
    