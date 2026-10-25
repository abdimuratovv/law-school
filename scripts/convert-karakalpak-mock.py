"""Convert this numbered DOCX mock to the platform CSV without guessing keys.

Keys come from the existing matching Uzbek publication, indexed by authored
question number. Question 8 is missing from the source and translated below
with the owner's explicit permission. No source document instructions execute.
"""
import argparse
import csv
import hashlib
import json
import re
import unicodedata
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

HEADERS = ['kind', 'topic', 'stem', 'A', 'B', 'C', 'D', 'correct', 'accepted', 'explanation', 'terms', 'defs', 'legal_label', 'legal_url']

def convert(source: Path, keys: Path, translations: Path, output: Path):
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    with zipfile.ZipFile(source) as archive:
        if any(name.startswith('word/media/') for name in archive.namelist()):
            raise ValueError('Image questions require manual conversion.')
        root = ET.fromstring(archive.read('word/document.xml'))
    translated = json.loads(translations.read_text(encoding='utf-8'))
    underlined = [''.join(t.text or '' for t in run.findall('.//w:t', ns)) for run in root.findall('.//w:r', ns) if run.find('w:rPr/w:u', ns) is not None]
    spans = [value for value in underlined if len(value) > 80]
    if len(spans) != 2:
        raise ValueError('Expected the two underlined question spans; inspect source formatting.')
    paragraphs = []
    for paragraph in root.findall('.//w:p', ns):
        paragraphs.append(''.join(node.text or '' if node.tag.endswith('}t') else '\n' if node.tag.endswith('}br') else ' ' if node.tag.endswith('}tab') else '' for node in paragraph.iter()))
    text = unicodedata.normalize('NFC', '\n'.join(paragraphs))
    key_rows = {row['number']: row for row in json.loads(keys.read_text(encoding='utf-8'))}
    if sorted(key_rows) != list(range(1, 46)):
        raise ValueError('Expected all 45 original question keys.')
    current = re.search(r'1\.\s*Tómende', text).start()
    rows = []
    for number in range(1, 46):
        key = key_rows[number]
        row = dict.fromkeys(HEADERS, '')
        row.update(kind=key['kind'], topic=key['topic'])
        if number == 8:
            row.update(stem=translated['missingQuestion']['stem'], **dict(zip('ABCD', translated['missingQuestion']['options'])))
        else:
            if number <= 35:
                labels = []
                position = current
                for letter in 'ABCD':
                    match = re.search(r'\b' + letter + r'\)', text[position:])
                    if not match:
                        raise ValueError(f'Missing option {letter} in question {number}')
                    start, end = position + match.start(), position + match.end()
                    labels.append((start, end))
                    position = end
                boundary_from = labels[-1][1]
            else:
                answer = re.search(r'Juwabı\s*:', text[current:])
                if not answer:
                    raise ValueError(f'Missing written-answer boundary {number}')
                boundary_from = current + answer.end()
            next_number = 9 if number == 7 else number + 1
            next_match = re.search(str(next_number) + r'\.\s*', text[boundary_from:]) if number < 45 else None
            if number < 45 and not next_match:
                raise ValueError(f'Missing question {next_number}')
            end = boundary_from + next_match.start() if next_match else len(text)
            if number <= 35:
                row['stem'] = text[current:labels[0][0]].strip()
                for index, letter in enumerate('ABCD'):
                    row[letter] = text[labels[index][1]:labels[index+1][0] if index < 3 else end].strip()
                row['D'] = re.sub(r'JAZBA\s+SORAWLAR\s*$', '', row['D']).strip()
            else:
                row['stem'] = re.split(r'Juwabı\s*:', text[current:end])[0].strip()
            current = end
        if number <= 35:
            if key['correct'] not in ('o1', 'o2', 'o3', 'o4'):
                raise ValueError(f'Unexpected source option ID at {number}')
            row['correct'] = 'ABCD'[int(key['correct'][-1])-1]
        else:
            row['accepted'] = '|'.join(translated['acceptedAnswers'][str(number)])
        if number == 23:
            row['stem'] += '\n\nAstına sızılǵan bólim: «' + spans[0] + '». '
        if number == 36:
            row['stem'] += '\n\nAstına sızılǵan bólim: «' + spans[1] + '». '
        row = {k: re.sub(r'[ \t]+', ' ', unicodedata.normalize('NFC', v)).strip() for k, v in row.items()}
        if not row['stem'].startswith(f'{number}.') or (number <= 35 and any(not row[k] for k in 'ABCD')):
            raise ValueError(f'Invalid extracted question {number}')
        rows.append(row)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open('w', encoding='utf-8-sig', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=HEADERS)
        writer.writeheader()
        writer.writerows(rows)
    report = {'questions': len(rows), 'single': 35, 'written': 10, 'translatedMissingQuestion': 8,
              'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
              'csvSha256': hashlib.sha256(output.read_bytes()).hexdigest(),
              'notes': ['Question 8 translated with owner approval.', 'Q18 repeats C/D in source; preserved.',
                        'Q23/Q36 underlined spans transcribed explicitly for plain-text CSV.',
                        'Choice keys copied by question number from existing Uzbek publication.',
                        'Written accepted answers localized from the existing Uzbek keys.']}
    output.with_suffix('.manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--keys', type=Path, required=True)
    parser.add_argument('--translations', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    convert(args.source, args.keys, args.translations, args.output)
