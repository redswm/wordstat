(function() {
    'use strict';

    // ==========================================
    // 1. ИНИЦИАЛИЗАЦИЯ И НАБЛЮДАТЕЛЬ (REACT) 
    // ==========================================
    function inject() {
        const wrap = document.querySelector('.save-button__wrapper');
        const btn = wrap?.querySelector('.save-button');
        if (!wrap || !btn || document.getElementById('ws-copy')) return false;
        createUI(wrap, btn);
        return true;
    }

    if (inject()) return;

    const startObserver = () => {
        const target = document.body || document.documentElement;
        if (!target) { setTimeout(startObserver, 100); return; }
        const obs = new MutationObserver(() => {
            if (document.querySelector('.save-button__wrapper')) { inject(); obs.disconnect(); }
        });
        obs.observe(target, { childList: true, subtree: true });
    };

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', startObserver)
        : startObserver();

    // ==========================================
    // 2. СОЗДАНИЕ ИНТЕРФЕЙСА (КНОПКИ + ФОРМЫ)
    // ==========================================
    function createUI(wrap, originalBtn) {
        // Хелпер для создания кнопок БЕЗ наследования .save-button
        const createBtn = (id, text) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'Button2 Button2_view_action Button2_size_s';
            btn.id = id;
            btn.style.marginRight = '6px';
            btn.innerHTML = `<span class="Button2-Text">${text}</span>`;
            btn.style.transition = 'none';
            btn.style.transform = 'none';
            return btn;
        };

        const copyBtn = createBtn('ws-copy', 'Копировать');
        const downloadBtn = createBtn('ws-download-btn', 'Скачать');
        const stopBtn = createBtn('ws-stop-btn', 'Стоп-слова');
        const exclBtn = createBtn('ws-excl-btn', '"!"');
        const statsBtn = createBtn('ws-stats-btn', 'Статистика');

        // ==========================================
        // ФОРМА СТОП-СЛОВ (высота 400px)
        // ==========================================
        const stopForm = document.createElement('div');
        stopForm.id = 'ws-stop-form';
        Object.assign(stopForm.style, {
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: '#fff', padding: '20px', borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)', zIndex: '99999',
            display: 'none', flexDirection: 'column', gap: '12px',
            width: '500px', maxWidth: '90vw', height: '400px',
            fontFamily: 'YS Text, Arial, sans-serif', boxSizing: 'border-box'
        });
        stopForm.innerHTML = `
            <h4 style="margin:0; font-size:16px; font-weight:600;">Стоп-слова</h4>
            <textarea id="ws-stop-input" spellcheck="false" style="width:100%; flex:1; padding:10px; border:1px solid #ccc; border-radius:6px; font-size:14px; resize:none; font-family:monospace; line-height:1.4; box-sizing:border-box;" placeholder="Введите слова, каждое с новой строки или через пробел/табуляцию"></textarea>
            <div style="display:flex; gap:8px; justify-content:flex-end;">
                <button id="ws-stop-cancel" style="padding:8px 16px; border:1px solid #ccc; background:#f5f5f5; border-radius:6px; cursor:pointer;">Отмена</button>
                <button id="ws-stop-save" style="padding:8px 16px; border:none; background:#197eea; color:#fff; border-radius:6px; cursor:pointer;">Сохранить</button>
            </div>
        `;
        document.body.appendChild(stopForm);

        // ==========================================
        // ФОРМА СТАТИСТИКИ
        // ==========================================
        const statsForm = document.createElement('div');
        statsForm.id = 'ws-stats-form';
        Object.assign(statsForm.style, {
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: '#fff', padding: '20px', borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)', zIndex: '99999',
            display: 'none', flexDirection: 'column', gap: '12px',
            width: '600px', maxWidth: '90vw', height: '500px',
            fontFamily: 'YS Text, Arial, sans-serif', boxSizing: 'border-box'
        });
        statsForm.innerHTML = `
            <h4 style="margin:0; font-size:16px; font-weight:600;">Статистика слов</h4>
            <div id="ws-stats-content" style="flex:1; overflow:auto; border:1px solid #eee; border-radius:6px; padding:10px; font-family:monospace; font-size:14px; line-height:1.6;"></div>
            <div style="display:flex; gap:8px; justify-content:flex-end;">
                <button id="ws-stats-copy" style="padding:8px 16px; border:1px solid #197eea; background:#fff; color:#197eea; border-radius:6px; cursor:pointer;">Копировать (TSV)</button>
                <button id="ws-stats-close" style="padding:8px 16px; border:none; background:#197eea; color:#fff; border-radius:6px; cursor:pointer;">Закрыть</button>
            </div>
        `;
        document.body.appendChild(statsForm);

        document.getElementById('ws-stop-input').value = localStorage.getItem('ws_stop_words') || '';

        // ==========================================
        // ОБРАБОТЧИКИ ФОРМ
        // ==========================================
        document.getElementById('ws-stop-cancel').onclick = () => stopForm.style.display = 'none';
        document.getElementById('ws-stop-save').onclick = () => {
            const raw = document.getElementById('ws-stop-input').value;
            const words = raw.split(/\s+/).map(w => w.trim()).filter(Boolean);
            localStorage.setItem('ws_stop_words', words.join('\n'));
            stopForm.style.display = 'none';
            showNotify(`Сохранено: ${words.length} слов`);
        };
        document.getElementById('ws-stats-close').onclick = () => statsForm.style.display = 'none';
        document.getElementById('ws-stats-copy').onclick = async () => {
            const content = document.getElementById('ws-stats-content');
            const rows = content.querySelectorAll('div[style*="display:flex"]');
            const tsv = Array.from(rows).map(row => {
                const span = row.querySelector('span');
                const strong = row.querySelector('strong');
                return span && strong ? `${span.textContent.trim()}\t${strong.textContent.trim()}` : row.textContent.trim();
            }).join('\n');
            await navigator.clipboard.writeText(tsv);
            showNotify('Статистика скопирована (TSV)');
        };

        stopBtn.addEventListener('click', e => { e.preventDefault(); stopForm.style.display = stopForm.style.display === 'flex' ? 'none' : 'flex'; });
        statsBtn.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            const wrapper = document.querySelector('.table__wrapper');
            if (!wrapper) return showNotify('Таблица не найдена');
            const cells = Array.from(wrapper.querySelectorAll('tr td:first-child, [class*="row"] > *:first-child, tbody tr > *:first-child'));
            const rawPhrases = cells.map(c => c.textContent.trim()).filter(Boolean);
            const allWords = rawPhrases.flatMap(p => p.toLowerCase().split(/\s+/).filter(Boolean));
            const freq = {};
            allWords.forEach(w => freq[w] = (freq[w] || 0) + 1);
            const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
            const content = document.getElementById('ws-stats-content');
            content.innerHTML = sorted.length
                ? sorted.map(([word, count]) => `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px dashed #eee;"><span>${escapeHtml(word)}</span><strong>${count}</strong></div>`).join('')
                : '<div style="text-align:center; color:#888; padding:20px;">Нет данных</div>';
            statsForm.style.display = 'flex';
        });

        // ==========================================
        // ОБРАБОТЧИК КНОПКИ "!"
        // ==========================================
        exclBtn.addEventListener('click', e => {
            e.preventDefault();
            const input = document.querySelector('input.textinput__control');
            if (!input) return;

            let phrase = input.value.trim();
            if (!phrase) return;

            // 1. Удаляем все ! и "
            phrase = phrase.replace(/[!"]/g, '');
            // 2. Вставляем ! перед каждым словом
            const transformed = phrase.split(/\s+/).filter(Boolean).map(w => `!${w}`).join(' ');
            // 3. Оборачиваем в кавычки
            const result = `"${transformed}"`;

            // Безопасно обновляем value (обход внутреннего стейта Wordstat)
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(input, result);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Закрытие по Esc
        document.addEventListener('keydown', e => { if (e.key === 'Escape') { stopForm.style.display = 'none'; statsForm.style.display = 'none'; } });
        // Закрытие по клику вне формы
        window.addEventListener('click', e => {
            if (stopForm.style.display === 'flex' && !stopForm.contains(e.target) && e.target !== stopBtn) stopForm.style.display = 'none';
            if (statsForm.style.display === 'flex' && !statsForm.contains(e.target) && e.target !== statsBtn) statsForm.style.display = 'none';
        });

        // ==========================================
        // 3. ЛОГИКА КОПИРОВАНИЯ
        // ==========================================
        copyBtn.addEventListener('click', async (e) => {
            e.preventDefault(); e.stopImmediatePropagation();
            const textSpan = copyBtn.querySelector('.Button2-Text');
            const originalText = textSpan.textContent;
            try {
                const stopRaw = localStorage.getItem('ws_stop_words') || '';
                const stopWords = stopRaw.split('\n').map(s => s.trim().toLowerCase()).filter(Boolean);
                const wrapper = document.querySelector('.table__wrapper');
                if (!wrapper) return showNotify('Таблица не найдена');
                const cells = Array.from(wrapper.querySelectorAll('tr td:first-child, [class*="row"] > *:first-child, tbody tr > *:first-child'));
                const rawItems = cells.map(c => c.textContent.trim()).filter(Boolean);
                const filtered = stopWords.length > 0 ? rawItems.filter(t => !stopWords.some(sw => t.toLowerCase().includes(sw))) : rawItems;
                if (document.querySelector('.wordstat__show-more-button')) showNotify('⚠️ Показаны не все запросы');
                await navigator.clipboard.writeText(filtered.join('\n'));
                textSpan.textContent = `✓ ${filtered.length}`;
                setTimeout(() => textSpan.textContent = originalText, 1200);
            } catch {
                textSpan.textContent = 'Ошибка';
                setTimeout(() => textSpan.textContent = originalText, 1200);
            }
        });

        // ==========================================
        // 4. ЛОГИКА СКАЧИВАНИЯ (ИСПРАВЛЕНО)
        // ==========================================
        downloadBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopImmediatePropagation();
            const textSpan = downloadBtn.querySelector('.Button2-Text');
            textSpan.textContent = '⏳';

            // 1. Клик по иконке внутри оригинальной кнопки
            const icon = document.querySelector('.save-button__icon');
            if (!icon) {
                showNotify('❌ Иконка скачивания не найдена');
                textSpan.textContent = 'Скачать';
                return;
            }

            console.log('[WS] Клик по .save-button__icon');
            icon.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));

            // 2. Ждём отрисовку меню и кликаем по .save-xlsx-button
            let attempts = 0;
            const checkXlsx = setInterval(() => {
                attempts++;
                const xlsxBtn = document.querySelector('.save-xlsx-button');
                if (xlsxBtn) {
                    clearInterval(checkXlsx);
                    console.log('[WS] ✅ .save-xlsx-button найдена');
                    xlsxBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                    textSpan.textContent = 'Скачать';
                    showNotify('Загрузка начата');
                } else if (attempts >= 20) { // 1000мс
                    clearInterval(checkXlsx);
                    console.warn('[WS] ❌ .save-xlsx-button не найдена');
                    textSpan.textContent = 'Скачать';
                    showNotify('⚠️ Меню не открылось');
                }
            }, 50);
        });

        // Вставляем кнопки слева от оригинальной
        wrap.insertBefore(statsBtn, originalBtn);
        wrap.insertBefore(exclBtn, originalBtn);
        wrap.insertBefore(stopBtn, originalBtn);
        wrap.insertBefore(downloadBtn, originalBtn);
        wrap.insertBefore(copyBtn, originalBtn);
    }

    // ==========================================
    // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // ==========================================
    function showNotify(msg) {
        let el = document.getElementById('ws-notify');
        if (!el) {
            el = document.createElement('div');
            el.id = 'ws-notify';
            Object.assign(el.style, {
                position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
                background: '#222', color: '#fff', padding: '12px 20px', borderRadius: '10px',
                fontSize: '14px', zIndex: '100000', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                transition: 'opacity 0.2s', opacity: '0'
            });
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.style.opacity = '1';
        clearTimeout(el._timeout);
        el._timeout = setTimeout(() => el.style.opacity = '0', 2500);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
})();
