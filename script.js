document.addEventListener('DOMContentLoaded', function() {
    // Основные элементы DOM
    const searchInput = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('resultsContainer');
    const searchDescription = document.getElementById('searchDescription');
    const filterApp1 = document.getElementById('filterApp1');
    const filterApp2 = document.getElementById('filterApp2');
    const filterApp3 = document.getElementById('filterApp3');
    
    // Текущий поисковый запрос и результаты
    let currentQuery = '';
    let currentResults = [];
    
    
    console.log('✅ Данные загружены:');
    console.log(`   • Основная таблица: ${okpd2MainData.length} записей`);
    console.log(`   • Прил.1: ${Object.keys(pp1875RefApp1).length} пунктов`);
    console.log(`   • Прил.2: ${Object.keys(pp1875RefApp2).length} пунктов`);
    console.log(`   • Прил.3: ${Object.keys(pp1875RefApp3).length} пунктов`);
    
    // ============================================
    // 1. ОСНОВНАЯ ФУНКЦИЯ ПОИСКА
    // ============================================
    function performSearch(query) {
        const trimmedQuery = query.trim();
        if (!trimmedQuery || trimmedQuery.length < 2) return [];
        
        // Определяем тип поиска (по коду или по названию)
        const hasDigits = /\d/.test(trimmedQuery);
        const startsWithDigitOrHasDot = /^\d|\./.test(trimmedQuery);
        
        if (hasDigits && startsWithDigitOrHasDot) {
            // ПОИСК ПО КОДУ: оставляем цифры и точки
            const cleanQuery = trimmedQuery.replace(/[^\d\.]/g, '');
            
            // Ищем все записи, чей код НАЧИНАЕТСЯ с cleanQuery
            return okpd2MainData.filter(item => {
                return item.code.startsWith(cleanQuery);
            });
        } else {
            // ПОИСК ПО НАЗВАНИЮ: по подстроке
            const searchLower = trimmedQuery.toLowerCase();
            const words = searchLower.split(/\s+/).filter(w => w.length > 0);
            
            if (words.length === 0) return [];
            
            // Ищем записи, где ВСЕ слова есть в названии
            return okpd2MainData.filter(item => {
                const nameLower = item.name.toLowerCase();
                
                if (words.length === 1) {
                    return nameLower.includes(words[0]);
                } else if (words.length > 1) {
                    return words.every(word => nameLower.includes(word));
                }
                return false;
            });
        }
    }
    
    // ============================================
    // 2. ФУНКЦИЯ ФИЛЬТРАЦИИ РЕЗУЛЬТАТОВ
    // ============================================
    function filterResults(results) {
        // Проверяем, какие фильтры активны
        const showApp1 = filterApp1.checked;
        const showApp2 = filterApp2.checked;
        const showApp3 = filterApp3.checked;
        
        // Если ни один фильтр не выбран - возвращаем пустой массив
        if (!showApp1 && !showApp2 && !showApp3) {
            return [];
        }
        
        // Если выбраны все фильтры - возвращаем все результаты
        if (showApp1 && showApp2 && showApp3) {
            return results;
        }
        
        // Фильтруем по выбранным приложениям
        return results.filter(item => {
            const hasApp1 = item.app1 && item.app1.trim() !== '';
            const hasApp2 = item.app2 && item.app2.trim() !== '';
            const hasApp3 = item.app3 && item.app3.trim() !== '';
            
            // Запись должна соответствовать ХОТЯ БЫ ОДНОМУ из выбранных фильтров
            let matches = false;
            if (showApp1 && hasApp1) matches = true;
            if (showApp2 && hasApp2) matches = true;
            if (showApp3 && hasApp3) matches = true;
            
            return matches;
        });
    }
    
    // ============================================
    // 3. ФОРМИРОВАНИЕ ТЕКСТА ДЛЯ ЯЧЕЕК СТАТУСОВ
    // ============================================
    function formatStatusCell(appField, refDict, appNumber) {
        // Если поле пустое
        if (!appField || appField.trim() === '') {
            return '<span class="status-empty">—</span>';
        }
        
        // Разбиваем строку на отдельные номера пунктов
        const pointIds = appField.split(',').map(id => id.trim()).filter(id => id !== '');
        
        // Создаём HTML для каждого пункта
        const pointLinks = pointIds.map(pointId => {
            const pointData = refDict[pointId];
            
            if (!pointData) {
                return `<span class="point-link" title="Данные пункта не найдены">п.${pointId}</span>`;
            }
            
            // Формируем текст ссылки
            let linkText = `п.${pointId}`;
            let titleText = pointData.name;
            
            // Для Приложения 3 добавляем квоту
            if (appNumber === 3 && pointData.quota) {
                linkText += ` <span class="quota-badge">${pointData.quota}%</span>`;
                titleText += ` (квота: ${pointData.quota}%)`;
            }
            
            // Ссылка на поиск в ГАРАНТе
            const searchQuery = encodeURIComponent(`ПП 1875 ${pointData.name}`);
            const garantUrl = `https://ivo.garant.ru/#/basesearch/${searchQuery}`;
            
            // Определяем класс в зависимости от приложения
            const appClass = `app${appNumber}-link`;
            
            return `<a href="${garantUrl}" class="point-link ${appClass}" target="_blank" rel="noopener noreferrer" title="${titleText}">${linkText}</a>`;
        });
        
        return pointLinks.join(', ');
    }
    
    // ============================================
    // 4. ОТОБРАЖЕНИЕ РЕЗУЛЬТАТОВ
    // ============================================
    function displayResults(results, query, forceShowAll = false) {
        // forceShowAll определяет, показывать все или только 50
        
        // Фильтруем результаты по выбранным приложениям
        const filteredResults = filterResults(results);
        
        // Обновляем описание поиска
        updateSearchDescription(query, filteredResults.length, results.length);
        
        // Если результатов нет после фильтрации
        if (filteredResults.length === 0) {
            // Если есть исходные результаты, но они отфильтровались
            if (results.length > 0) {
                resultsContainer.innerHTML = `
                    <div class="no-results">
                        По запросу "<strong>${query}</strong>" найдено <strong>${results.length}</strong> записей, 
                        но ни одна не соответствует выбранным фильтрам.
                        <div style="margin-top: 10px; font-size: 0.9em;">
                            Попробуйте изменить фильтры выше.
                        </div>
                    </div>
                `;
            } else {
                // Если результатов вообще не было найдено
                resultsContainer.innerHTML = `
                    <div class="no-results">
                        По запросу "<strong>${query}</strong>" ничего не найдено.<br>
                        Попробуйте другие ключевые слова.
                    </div>
                `;
            }
            return;
        }
        
        // Сортируем результаты
        const sortedResults = sortResults(filteredResults, query);
        
        // Определяем, сколько результатов показывать
        const resultsToShow = forceShowAll ? sortedResults : sortedResults.slice(0, 50);
        
        // Создаём HTML таблицы
        const tableHtml = `
            <table class="results-table">
                <thead>
                    <tr>
                        <th class="col-code">Код ОКПД2</th>
                        <th class="col-name">Наименование</th>
                        <th class="col-app1">Прил. 1<br><span style="font-weight: normal; font-size: 0.9em;">(Запрет)</span></th>
                        <th class="col-app2">Прил. 2<br><span style="font-weight: normal; font-size: 0.9em;">(Ограничение)</span></th>
                        <th class="col-app3">Прил. 3<br><span style="font-weight: normal; font-size: 0.9em;">(Преимущество)</span></th>
                    </tr>
                </thead>
                <tbody>
                    ${resultsToShow.map(item => `
                        <tr>
                            <td>
                                <div class="code-container">
                                    <span class="code-text">${highlightMatch(item.code, query)}</span>
                                    <button class="copy-btn" data-code="${item.code}" title="Копировать код">
                                        📋
                                    </button>
                                    <a href="https://ivo.garant.ru/#/basesearch/окпд2%20${item.code}" 
                                    class="source-link garant-link" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    title="Найти код в системе ГАРАНТ">
                                        🏛️
                                    </a>
                                </div>
                            </td>
                            <td>${highlightMatch(item.name, query)}</td>
                            <td class="status-cell">${formatStatusCell(item.app1, pp1875RefApp1, 1)}</td>
                            <td class="status-cell">${formatStatusCell(item.app2, pp1875RefApp2, 2)}</td>
                            <td class="status-cell">${formatStatusCell(item.app3, pp1875RefApp3, 3)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        // Создаём полный HTML
        let fullHtml = tableHtml; // Только таблица, без блока статистики
        
        // Добавляем кнопку "Показать все", если нужно
        if (!forceShowAll && sortedResults.length > 50) {
            fullHtml += `
                <div class="more-results">
                    Показано: ${resultsToShow.length} из ${sortedResults.length} записей
                    <button id="showAllBtn" class="show-all-btn">Показать все</button>
                </div>
            `;
        }
        
        // Вставляем HTML в контейнер
        resultsContainer.innerHTML = fullHtml;
        
        // Добавляем обработчик кнопки "Показать все"
        if (!forceShowAll && sortedResults.length > 50) {
            document.getElementById('showAllBtn').addEventListener('click', function() {
                displayResults(results, query, true); // forceShowAll = true
            });
        }
    }
    
    // ============================================
    // 5. ОБНОВЛЕНИЕ ОПИСАНИЯ ПОИСКА
    // ============================================
    function updateSearchDescription(query, filteredCount, totalCount) {
        if (!query || query.length < 2) {
            searchDescription.style.display = 'none';
            return;
        }
        
        // Определяем активные фильтры
        const activeFilters = [];
        if (filterApp1.checked) activeFilters.push('Запрет');
        if (filterApp2.checked) activeFilters.push('Ограничение');
        if (filterApp3.checked) activeFilters.push('Преимущество');
        
        let filterText = '';
        if (activeFilters.length === 0) {
            filterText = ' <span style="color: #c62828;">(все фильтры выключены)</span>';
        } else if (activeFilters.length < 3) {
            filterText = ` (фильтры: ${activeFilters.join(', ')})`;
        }
        
        // Формируем текст
        let descriptionText = `
            По запросу "<strong>${query}</strong>"${filterText}
        `;
        
        if (totalCount > 0) {
            if (filteredCount === totalCount) {
                descriptionText += ` · Найдено: <strong>${totalCount}</strong> записей`;
            } else {
                descriptionText += ` · Найдено: <strong>${filteredCount}</strong> из <strong>${totalCount}</strong> записей`;
            }
        }
        
        // Показываем блок с описанием
        searchDescription.innerHTML = descriptionText;
        searchDescription.style.display = 'block';
    }
    
    // ============================================
    // 6. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // ============================================
    
    // Сортировка результатов
    function sortResults(results, query) {
        const queryLower = query.toLowerCase();
        const hasDigits = /\d/.test(query);
        const startsWithDigitOrHasDot = /^\d|\./.test(query);
        const isCodeSearch = hasDigits && startsWithDigitOrHasDot;
        const cleanQuery = isCodeSearch ? query.replace(/[^\d\.]/g, '') : '';
        
        return [...results].sort((a, b) => {
            // Если поиск по коду
            if (isCodeSearch) {
                // Приоритет 1: точное совпадение кода
                if (a.code === cleanQuery) return -1;
                if (b.code === cleanQuery) return 1;
                
                // Приоритет 2: более короткие коды (более общие) выше
                return a.code.length - b.code.length;
            }
            // Если поиск по названию
            else {
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();
                
                // Приоритет 1: слово начинается с запроса
                const aStartsWith = aName.startsWith(queryLower) ? 1 : 0;
                const bStartsWith = bName.startsWith(queryLower) ? 1 : 0;
                if (aStartsWith !== bStartsWith) return bStartsWith - aStartsWith;
                
                // Приоритет 2: более короткие названия (как правило, более общие)
                return aName.length - bName.length;
            }
        });
    }
    
    // Подсветка совпадений
    function highlightMatch(text, query) {
        if (!query || query.length < 2) return text;
        
        const hasDigits = /\d/.test(query);
        const startsWithDigitOrHasDot = /^\d|\./.test(query);
        
        if (hasDigits && startsWithDigitOrHasDot) {
            const cleanQuery = query.replace(/[^\d\.]/g, '');
            if (text.startsWith(cleanQuery)) {
                return `<mark class="code-match">${cleanQuery}</mark>${text.substring(cleanQuery.length)}`;
            }
            return text;
        }
        
        // Подсветка для текстового поиска
        const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        let highlighted = text;
        
        words.forEach(word => {
            if (word.length < 2) return;
            const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            highlighted = highlighted.replace(regex, '<mark>$1</mark>');
        });
        
        return highlighted;
    }
    
    // ============================================
    // 7. ОБРАБОТЧИКИ СОБЫТИЙ
    // ============================================
    
    // Обработчик ввода в поисковую строку
    let searchTimeout;
    searchInput.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        currentQuery = query;
        
        if (!query) {
            // Если запрос пустой, скрываем описание и показываем начальное сообщение
            searchDescription.style.display = 'none';
            resultsContainer.innerHTML = `
                <div class="initial-message">
                    Введите код ОКПД2 или название товара/работы/услуги для проверки действия национального режима.
                    <div class="example-queries">
                        Примеры запросов: <code>08.12.12.140</code> (Щебень), <code>13.96.17</code> (Ткани узкие), <code>медицинская</code>
                    </div>
                </div>
            `;
            return;
        }
        
        // Дебаунсинг: ждём 200мс после последнего ввода
        searchTimeout = setTimeout(() => {
            currentResults = performSearch(query);
            displayResults(currentResults, query);
        }, 200);
    });
    
    // Обработчик клавиши Enter
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            currentQuery = query;
            currentResults = performSearch(query);
            displayResults(currentResults, query);
        }
    });
    
    // Обработчики изменения фильтров
    function handleFilterChange() {
        if (currentQuery && currentQuery.length >= 2) {
            displayResults(currentResults, currentQuery);
        }
    }
    
    filterApp1.addEventListener('change', handleFilterChange);
    filterApp2.addEventListener('change', handleFilterChange);
    filterApp3.addEventListener('change', handleFilterChange);
    
    // ============================================
    // 8. ФУНКЦИИ КОПИРОВАНИЯ КОДА
    // ============================================
    
    // Инициализация кнопок копирования
    function setupCopyButtons() {
        document.addEventListener('click', function(e) {
            if (e.target.closest('.copy-btn')) {
                const copyBtn = e.target.closest('.copy-btn');
                const codeToCopy = copyBtn.getAttribute('data-code');
                copyToClipboard(codeToCopy, copyBtn);
            }
        });
    }
    
    // Основная функция копирования
    function copyToClipboard(text, button) {
        const originalHtml = button.innerHTML;
        
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    showCopyFeedback(button, '✅');
                    setTimeout(() => {
                        button.innerHTML = originalHtml;
                    }, 1500);
                })
                .catch(err => {
                    console.error('Ошибка копирования:', err);
                    fallbackCopy(text, button, originalHtml);
                });
        } else {
            fallbackCopy(text, button, originalHtml);
        }
    }
    
    // Fallback метод копирования
    function fallbackCopy(text, button, originalHtml) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showCopyFeedback(button, '✅');
            } else {
                showCopyFeedback(button, '❌');
            }
        } catch (err) {
            console.error('Ошибка fallback копирования:', err);
            showCopyFeedback(button, '❌');
        } finally {
            document.body.removeChild(textArea);
            setTimeout(() => {
                button.innerHTML = originalHtml;
            }, 1500);
        }
    }
    
    // Показ обратной связи
    function showCopyFeedback(button, icon) {
        button.innerHTML = icon;
        button.classList.add('copied');
        setTimeout(() => {
            button.classList.remove('copied');
        }, 1500);
    }
    
    // ============================================
    // 9. ИНИЦИАЛИЗАЦИЯ
    // ============================================
    
    // Настраиваем кнопки копирования
    setupCopyButtons();
    
    // Показываем начальное сообщение
    resultsContainer.innerHTML = `
        <div class="initial-message">
            Введите код ОКПД2 или название товара/работы/услуги для проверки действия национального режима.
            <div class="example-queries">
                Примеры запросов: <code>08.12.12.140</code> (Щебень), <code>13.96.17</code> (Ткани узкие), <code>медицинская</code>
            </div>
        </div>
    `;
    
    console.log('✅ Веб-интерфейс инициализирован и готов к работе!');
});