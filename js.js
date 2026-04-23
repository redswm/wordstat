(function() {
    'use strict';

    let wsButtonsCreated = false;

    function inject() {
        if (wsButtonsCreated) return true;
        const anchor = document.querySelector('.wordstat__settings-wrapper');
        if (!anchor || document.getElementById('ws-custom-wrap')) return false;
        createUI(anchor);
        wsButtonsCreated = true;
        return true;
    }

    if (inject()) return;

    const startObserver = () => {
        const target = document.body || document.documentElement;
        if (!target) { setTimeout(startObserver, 100); return; }
        const obs = new MutationObserver(() => {
            if (document.querySelector('.wordstat__settings-wrapper')) {
                inject();
            }
        });
        obs.observe(target, { childList: true, subtree: true });
    };

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', startObserver)
        : startObserver();

    function createUI(anchorElement) {
        const createBtn = (id, text, extraClass = '') => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `Button2 Button2_view_action Button2_size_s ws-btn ${extraClass}`;
            btn.id = id;
            btn.innerHTML = `<span class="Button2-Text">${text}</span>`;
            return btn;
        };

        // Порядок кнопок: Статистика | "!" | "[!]" | Пробел | ⇆ | Копировать | Скачать | Стоп-слова
        const statsBtn = createBtn('ws-stats-btn', 'Статистика');
        const exclBtn = createBtn('ws-excl-btn', '"!"');
        const bracketBtn = createBtn('ws-bracket-btn', '"[!]"');
        const clearBtn = createBtn('ws-clear-btn', '&nbsp;', 'ws-clear-btn');
        const rotateBtn = createBtn('ws-rotate-btn', '⇆');
        const copyBtn = createBtn('ws-copy', 'Копировать', 'ws-copy-btn');
        const downloadBtn = createBtn('ws-download-btn', 'Скачать');
        const stopBtn = createBtn('ws-stop-btn', 'Стоп-слова');

        let customWrap = document.getElementById('ws-custom-wrap');
        if (!customWrap) {
            customWrap = document.createElement('div');
            customWrap.id = 'ws-custom-wrap';
            customWrap.className = 'ws-custom-wrap';
            anchorElement.after(customWrap);
        }

        // === ВОССТАНОВЛЕНИЕ ЛОГИКИ ЦВЕТА КНОПКИ "КОПИРОВАТЬ" ===
        function updateCopyBtnColor() {
            const hasMore = document.querySelector('.wordstat__show-more-button');
            copyBtn.classList.toggle('ws-green', !hasMore);
            copyBtn.classList.toggle('ws-gray', !!hasMore);
        }
        updateCopyBtnColor();
        const colorObserver = new MutationObserver(updateCopyBtnColor);
        colorObserver.observe(document.body, { childList: true, subtree: true });

        // === ФОРМЫ ===
        const stopForm = document.createElement('div');
        stopForm.id = 'ws-stop-form';
        stopForm.className = 'ws-form';
        stopForm.innerHTML = `<h4>Стоп-слова</h4><textarea id="ws-stop-input" spellcheck="false" placeholder="Введите слова..."></textarea><div class="ws-form-actions"><button id="ws-stop-cancel" class="ws-btn-cancel">Отмена</button><button id="ws-stop-save" class="ws-btn-primary">Сохранить</button></div>`;
        document.body.appendChild(stopForm);

        const statsForm = document.createElement('div');
        statsForm.id = 'ws-stats-form';
        statsForm.className = 'ws-form';
        statsForm.innerHTML = `<h4>Статистика слов</h4><div id="ws-stats-content" class="ws-stats-content"></div><div class="ws-form-actions"><button id="ws-stats-copy" class="ws-btn-outline">Копировать (TSV)</button><button id="ws-stats-close" class="ws-btn-primary">Закрыть</button></div>`;
        document.body.appendChild(statsForm);

        if (document.getElementById('ws-stop-input')) {
            document.getElementById('ws-stop-input').value = localStorage.getItem('ws_stop_words') || '';
        }

        // Обработчики форм
        document.getElementById('ws-stop-cancel')?.addEventListener('click', () => stopForm.style.display = 'none');
        document.getElementById('ws-stop-save')?.addEventListener('click', () => {
            const raw = document.getElementById('ws-stop-input')?.value || '';
            const words = raw.split(/\s+/).map(w => w.trim()).filter(Boolean);
            localStorage.setItem('ws_stop_words', words.join('\n'));
            stopForm.style.display = 'none';
            showNotify(`Сохранено: ${words.length} слов`);
        });
        document.getElementById('ws-stats-close')?.addEventListener('click', () => statsForm.style.display = 'none');
        document.getElementById('ws-stats-copy')?.addEventListener('click', async () => {
            const content = document.getElementById('ws-stats-content');
            if (!content) return;
            const rows = content.querySelectorAll('.ws-stats-row');
            const tsv = Array.from(rows).map(row => {
                const span = row.querySelector('span');
                const strong = row.querySelector('strong');
                return span && strong ? `${span.textContent.trim()}\t${strong.textContent.trim()}` : row.textContent.trim();
            }).join('\n');
            await navigator.clipboard.writeText(tsv);
            showNotify('Статистика скопирована (TSV)');
        });

        // === ОБРАБОТЧИКИ КНОПОК ===
        statsBtn?.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            const phrases = [];
            const wrapper = document.querySelector('.table__wrapper');
            if (wrapper) {
                const cells = Array.from(wrapper.querySelectorAll('tr td:first-child, [class*="row"] > *:first-child, tbody tr > *:first-child'));
                phrases.push(...cells.map(c => c.textContent.trim()).filter(Boolean));
            }
            if (phrases.length === 0) {
                const listItems = document.querySelectorAll('.wordstat__content-preview-list .wordstat__phrase, .phrase-list .phrase, [class*="phrase"]');
                if (listItems.length) phrases.push(...Array.from(listItems).map(el => el.textContent.trim()).filter(Boolean));
            }
            if (phrases.length === 0) {
                const input = document.querySelector('input.textinput__control');
                if (input?.value.trim()) phrases.push(input.value.trim());
            }
            if (phrases.length === 0) return showNotify('Нет данных для анализа');
            
            const allWords = phrases.flatMap(p => p.toLowerCase().split(/\s+/).filter(w => !/[!\[\]"]/.test(w)));
            const freq = {};
            allWords.forEach(w => freq[w] = (freq[w] || 0) + 1);
            const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
            const content = document.getElementById('ws-stats-content');
            if (content) {
                content.innerHTML = sorted.length
                    ? sorted.map(([word, count]) => `<div class="ws-stats-row"><span>${escapeHtml(word)}</span><strong>${count}</strong></div>`).join('')
                    : '<div class="ws-stats-empty">Нет данных</div>';
                statsForm.style.display = 'flex';
            }
        });

        exclBtn?.addEventListener('click', e => {
            e.preventDefault();
            const input = document.querySelector('input.textinput__control');
            if (!input) return;
            let phrase = input.value.trim();
            if (!phrase) return;
            const { words } = parsePhraseStrict(phrase);
            let res = words.map(w => `!${w}`).join(' ');
            res = `"${res}"`;
            setInputValue(input, res);
        });

        bracketBtn?.addEventListener('click', e => {
            e.preventDefault();
            const input = document.querySelector('input.textinput__control');
            if (!input) return;
            let phrase = input.value.trim();
            if (!phrase) return;
            const { words } = parsePhraseStrict(phrase);
            let res = words.map(w => `!${w}`).join(' ');
            res = `[${res}]`;
            res = `"${res}"`;
            setInputValue(input, res);
        });

        rotateBtn?.addEventListener('click', e => {
            e.preventDefault();
            const input = document.querySelector('input.textinput__control');
            if (!input) return;
            let phrase = input.value.trim();
            if (!phrase) return;
            let hasQuote = phrase.startsWith('"') && phrase.endsWith('"');
            let inner = hasQuote ? phrase.slice(1, -1) : phrase;
            let hasBracket = inner.startsWith('[') && inner.endsWith(']');
            let core = hasBracket ? inner.slice(1, -1) : inner;
            let words = core.trim().split(/\s+/).filter(Boolean);
            if (words.length < 2) return;
            words.push(words.shift());
            let res = words.join(' ');
            if (hasBracket) res = `[${res}]`;
            if (hasQuote) res = `"${res}"`;
            setInputValue(input, res);
        });

        clearBtn?.addEventListener('click', e => {
            e.preventDefault();
            const input = document.querySelector('input.textinput__control');
            if (!input) return;
            let phrase = input.value.trim();
            if (!phrase) return;
            let res = phrase.replace(/[!\[\]"]/g, '').replace(/\s+/g, ' ').trim();
            setInputValue(input, res);
        });

        copyBtn?.addEventListener('click', async (e) => {
            e.preventDefault(); e.stopImmediatePropagation();
            const textSpan = copyBtn.querySelector('.Button2-Text');
            const originalText = textSpan?.textContent || 'Копировать';
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
                if (textSpan) { textSpan.textContent = `✓ ${filtered.length}`; setTimeout(() => textSpan.textContent = originalText, 1200); }
            } catch {
                if (textSpan) { textSpan.textContent = 'Ошибка'; setTimeout(() => textSpan.textContent = originalText, 1200); }
            }
        });

        downloadBtn?.addEventListener('click', (e) => {
            e.preventDefault(); e.stopImmediatePropagation();
            const textSpan = downloadBtn.querySelector('.Button2-Text');
            if (textSpan) textSpan.textContent = '⏳';
            const icon = document.querySelector('.save-button__icon');
            if (!icon) {
                showNotify('❌ Иконка скачивания не найдена');
                if (textSpan) textSpan.textContent = 'Скачать';
                return;
            }
            icon.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            let attempts = 0;
            const checkXlsx = setInterval(() => {
                attempts++;
                const xlsxBtn = document.querySelector('.save-xlsx-button');
                if (xlsxBtn) {
                    clearInterval(checkXlsx);
                    xlsxBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                    if (textSpan) textSpan.textContent = 'Скачать';
                    showNotify('Загрузка начата');
                } else if (attempts >= 20) {
                    clearInterval(checkXlsx);
                    if (textSpan) textSpan.textContent = 'Скачать';
                    showNotify('⚠️ Меню не открылось');
                }
            }, 50);
        });

        stopBtn?.addEventListener('click', e => { 
            e.preventDefault(); 
            stopForm.style.display = stopForm.style.display === 'flex' ? 'none' : 'flex'; 
        });

        document.addEventListener('keydown', e => { 
            if (e.key === 'Escape') { stopForm.style.display = 'none'; statsForm.style.display = 'none'; } 
        });
        window.addEventListener('click', e => {
            if (stopForm.style.display === 'flex' && !stopForm.contains(e.target) && e.target !== stopBtn) stopForm.style.display = 'none';
            if (statsForm.style.display === 'flex' && !statsForm.contains(e.target) && e.target !== statsBtn) statsForm.style.display = 'none';
        });

        // === ВСТАВКА КНОПОК (без <br>, перенос через CSS flex-wrap) ===
        if (customWrap && !customWrap.querySelector('#ws-stats-btn')) {
            customWrap.appendChild(statsBtn);
            customWrap.appendChild(exclBtn);
            customWrap.appendChild(bracketBtn);
            customWrap.appendChild(clearBtn);
            customWrap.appendChild(rotateBtn);
            customWrap.appendChild(copyBtn);
            customWrap.appendChild(downloadBtn);
            customWrap.appendChild(stopBtn);
        }
    }

    function setInputValue(input, value) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeSetter) { nativeSetter.call(input, value); } else { input.value = value; }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function parsePhraseStrict(phrase) {
        let hasQuote = phrase.startsWith('"') && phrase.endsWith('"');
        let inner = hasQuote ? phrase.slice(1, -1) : phrase;
        let hasBracket = inner.startsWith('[') && inner.endsWith(']');
        let core = hasBracket ? inner.slice(1, -1) : inner;
        let clean = core.replace(/!/g, '').trim();
        let words = clean.split(/\s+/).filter(Boolean);
        return { hasQuote, hasBracket, words };
    }

    function showNotify(msg) {
        let el = document.getElementById('ws-notify');
        if (!el) { el = document.createElement('div'); el.id = 'ws-notify'; document.body.appendChild(el); }
        el.textContent = msg;
        el.classList.add('ws-show');
        clearTimeout(el._timeout);
        el._timeout = setTimeout(() => el.classList.remove('ws-show'), 2500);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
})();
