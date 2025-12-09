#!/usr/bin/env python3
"""
Скрипт сборки данных для проекта 'Интерактивный справочник ПП 1875 для ОКПД2'
Вторая итерация: создание структур данных и алгоритм обогащения.
"""

import sys
import json
from pathlib import Path
from datetime import datetime

def read_tsv_file(file_path, expected_columns, description):
    """ (Функция из первой итерации - оставляем без изменений) """
    print(f"📖 Чтение {description} ({file_path})...")
    
    if not file_path.exists():
        print(f"   ❌ Ошибка: Файл не найден.")
        return None
    
    data = []
    line_num = 0
    problems = 0
    current_row = []
    current_line_content = ""
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line_num += 1
                line = line.rstrip('\n')
                
                if not line.strip():
                    if current_row:
                        print(f"   ⚠️  Строка {line_num}: пустая строка внутри записи, продолжаем сборку")
                    continue
                
                if current_line_content:
                    current_line_content += " " + line
                else:
                    current_line_content = line
                
                parts = current_line_content.split('\t')
                
                if len(parts) >= expected_columns:
                    cleaned_parts = [part.strip() for part in parts[:expected_columns]]
                    data.append(cleaned_parts)
                    
                    current_row = []
                    current_line_content = ""
                elif len(parts) == 1 and parts[0].replace('.', '').isdigit():
                    if data:
                        last_record = data[-1]
                        if len(last_record) >= 3:
                            last_record[2] += " " + parts[0].strip()
                    current_line_content = ""
                else:
                    continue
                
        if current_line_content:
            parts = current_line_content.split('\t')
            if len(parts) >= expected_columns:
                cleaned_parts = [part.strip() for part in parts[:expected_columns]]
                data.append(cleaned_parts)
            else:
                print(f"   ⚠️  В конце файла осталась неполная запись: {current_line_content[:50]}...")
                problems += 1
                
    except Exception as e:
        print(f"   ❌ Ошибка при чтении файла: {e}")
        import traceback
        traceback.print_exc()
        return None
    
    print(f"   ✅ Прочитано записей: {len(data)}")
    if problems > 0:
        print(f"   ⚠️  Обнаружено проблем: {problems}")
    
    return data

def split_codes_string(codes_str):
    """
    Разбивает строку с кодами на отдельные коды ОКПД2.
    Пример: "32.50.21.121, 32.50.21.122" -> ["32.50.21.121", "32.50.21.122"]
    """
    if not codes_str:
        return []
    
    # Заменяем запятые на пробелы, затем разбиваем по пробелам
    codes = codes_str.replace(',', ' ').split()
    # Очищаем от лишних символов и фильтруем пустые
    clean_codes = [code.strip() for code in codes if code.strip()]
    return clean_codes

def enrich_main_data(main_data, code_to_index, app_rows, app_field_name, app_ref_dict):
    """
    Обогащает main_data на основе данных из приложения.
    
    Args:
        main_data: список словарей с основными данными
        code_to_index: словарь {код: индекс_в_main_data}
        app_rows: данные приложения (список списков)
        app_field_name: имя поля для записи ('app1', 'app2', 'app3')
        app_ref_dict: справочник приложения для заполнения
    """
    print(f"\n🔧 Обогащение данными из приложения ({app_field_name})...")
    
    processed_points = 0
    total_codes_found = 0
    
    for app_row in app_rows:
        point_id = app_row[0].replace('.', '')  # "1." -> "1"
        point_name = app_row[1]
        codes_str = app_row[2]
        
        # Для Приложения 3 берем квоту
        if len(app_row) > 3:
            quota = app_row[3]
            app_ref_dict[point_id] = {"name": point_name, "quota": quota}
        else:
            app_ref_dict[point_id] = {"name": point_name}
        
        # Разбиваем строку с кодами
        target_codes = split_codes_string(codes_str)
        
        if not target_codes:
            print(f"   ⚠️  Пункт {point_id}: нет кодов ОКПД2")
            continue
        
        processed_points += 1
        
        # Для каждого кода из приложения ищем все дочерние коды
        for target_code in target_codes:
            codes_found_for_target = 0
            
            # Ищем все коды, которые начинаются с target_code
            for okpd_code, idx in code_to_index.items():
                if okpd_code.startswith(target_code):
                    # Получаем текущее значение поля
                    current_value = main_data[idx].get(app_field_name, "")
                    
                    # Добавляем point_id, если его еще нет
                    if point_id not in current_value.split(','):
                        new_value = current_value + ("," if current_value else "") + point_id
                        main_data[idx][app_field_name] = new_value
                        codes_found_for_target += 1
            
            total_codes_found += codes_found_for_target
            if codes_found_for_target == 0:
                print(f"   ⚠️  Код '{target_code}' (п.{point_id}) не найден в классификаторе")
    
    print(f"   ✅ Обработано пунктов: {processed_points}")
    print(f"   ✅ Найдено соответствий: {total_codes_found}")

def main():
    print("=" * 70)
    print("🔧 СКРИПТ СБОРКИ ДАННЫХ ДЛЯ СПРАВОЧНИКА ПП 1875")
    print("   Вторая итерация: создание структур и алгоритм обогащения")
    print("=" * 70)
    
    # Определяем пути к файлам
    base_dir = Path(".")
    
    # Читаем исходные данные
    okpd2_rows = read_tsv_file(base_dir / "source_okpd2.tsv", 2, "классификатора ОКПД2")
    app1_rows = read_tsv_file(base_dir / "source_pp1875_app1.tsv", 3, "Приложения 1")
    app2_rows = read_tsv_file(base_dir / "source_pp1875_app2.tsv", 3, "Приложения 2")
    app3_rows = read_tsv_file(base_dir / "source_pp1875_app3.tsv", 4, "Приложения 3")
    
    if not all([okpd2_rows, app1_rows, app2_rows, app3_rows]):
        print("❌ Не все файлы загружены корректно.")
        sys.exit(1)
    
    # Шаг 1: Создаем основную структуру данных
    print("\n" + "=" * 70)
    print("🏗️  СОЗДАНИЕ СТРУКТУР ДАННЫХ")
    
    main_data = []
    code_to_index = {}  # Для быстрого поиска: {код: индекс_в_main_data}
    
    for i, row in enumerate(okpd2_rows):
        record = {
            "code": row[0],
            "name": row[1],
            "app1": "",  # Номера пунктов из Прил.1
            "app2": "",  # Номера пунктов из Прил.2
            "app3": ""   # Номера пунктов из Прил.3
        }
        main_data.append(record)
        code_to_index[row[0]] = i
    
    print(f"✅ Создано записей в main_data: {len(main_data)}")
    print(f"✅ Записей в code_to_index: {len(code_to_index)}")
    
    # Создаем справочники для приложений
    ref_app1 = {}
    ref_app2 = {}
    ref_app3 = {}
    
    # Шаг 2: Обогащаем данные из приложений
    print("\n" + "=" * 70)
    print("🔍 ОБОГАЩЕНИЕ ДАННЫХ")
    
    # Приложение 1
    enrich_main_data(main_data, code_to_index, app1_rows, "app1", ref_app1)
    
    # Приложение 2
    enrich_main_data(main_data, code_to_index, app2_rows, "app2", ref_app2)
    
    # Приложение 3
    enrich_main_data(main_data, code_to_index, app3_rows, "app3", ref_app3)
    
    # Шаг 3: Проверяем результаты на тестовых данных
    print("\n" + "=" * 70)
    print("🧪 ТЕСТИРОВАНИЕ РЕЗУЛЬТАТОВ")
    
    test_cases = [
        ("08.12.12.140", "Щебень (должен быть в Прил.2 и Прил.3)"),
        ("13.96.17", "Ткани узкие (должен быть в Прил.3)"),
        ("13.96.17.130", "Тесьма плетеная (наследование из Прил.3)"),
        ("01.11.11.110", "Пшеница (не должен быть ни в одном приложении)"),
    ]
    
    print("\nПроверка ключевых кодов:")
    for test_code, description in test_cases:
        if test_code in code_to_index:
            idx = code_to_index[test_code]
            record = main_data[idx]
            print(f"\n  📍 {test_code} - {description}")
            print(f"     app1: '{record['app1'] or '—'}'")
            print(f"     app2: '{record['app2'] or '—'}'")
            print(f"     app3: '{record['app3'] or '—'}'")
        else:
            print(f"\n  ❌ {test_code} - не найден в классификаторе!")
    
    # Статистика
    print("\n" + "=" * 70)
    print("📊 СТАТИСТИКА")
    
    stats = {
        "app1": 0,  # Количество записей с заполненным app1
        "app2": 0,
        "app3": 0,
        "any": 0,   # Количество записей с хотя бы одним заполненным полем
        "none": 0   # Количество записей без заполненных полей
    }
    
    for record in main_data:
        has_app1 = bool(record["app1"])
        has_app2 = bool(record["app2"])
        has_app3 = bool(record["app3"])
        
        if has_app1: stats["app1"] += 1
        if has_app2: stats["app2"] += 1
        if has_app3: stats["app3"] += 1
        if has_app1 or has_app2 or has_app3:
            stats["any"] += 1
        else:
            stats["none"] += 1
    
    print(f"   • Записей с Прил.1: {stats['app1']} ({stats['app1']/len(main_data)*100:.1f}%)")
    print(f"   • Записей с Прил.2: {stats['app2']} ({stats['app2']/len(main_data)*100:.1f}%)")
    print(f"   • Записей с Прил.3: {stats['app3']} ({stats['app3']/len(main_data)*100:.1f}%)")
    print(f"   • Записей с любым статусом: {stats['any']} ({stats['any']/len(main_data)*100:.1f}%)")
    print(f"   • Записей без статуса: {stats['none']} ({stats['none']/len(main_data)*100:.1f}%)")
    
    # Шаг 4: Генерируем JS-файлы (пока в отладочном режиме)
    print("\n" + "=" * 70)
    print("💾 ПОДГОТОВКА К ГЕНЕРАЦИИ JS-ФАЙЛОВ")
    
    # Примеры для проверки
    print("\nПримеры записей для JS-файлов:")
    
    # Пример главной записи
    if len(main_data) > 0:
        sample = main_data[0]
        print(f"\nГлавная таблица (первая запись):")
        print(f"  Код: {sample['code']}")
        print(f"  Название: {sample['name'][:50]}...")
        print(f"  app1: '{sample['app1']}'")
        print(f"  app2: '{sample['app2']}'")
        print(f"  app3: '{sample['app3']}'")
    
    # Пример справочника
    if ref_app3:
        first_key = list(ref_app3.keys())[0]
        print(f"\nСправочник Прил.3 (первый пункт):")
        print(f"  Ключ: '{first_key}'")
        print(f"  Значение: {ref_app3[first_key]}")
    
    print("\n" + "=" * 70)
    print("✅ ВТОРАЯ ИТЕРАЦИЯ ЗАВЕРШЕНА")
    print("   Структуры созданы, алгоритм обогащения реализован.")
    print("   Следующий шаг - генерация JS-файлов.")
    print("=" * 70)

if __name__ == "__main__":
    main()