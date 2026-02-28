#!/usr/bin/env python3
"""
原始版本 - 输出人类可读格式
来源：用户提供

用法：
  python3 dict-original.py pronunciation
  echo "beautiful\nrhythm" | python3 dict-original.py
"""
import re, sys
from CoreServices import DictionaryServices

def parse(word):
    r = DictionaryServices.DCSCopyTextDefinition(None, word, (0, len(word)))
    if not r:
        print(f"Not found: {word}")
        return

    # syllables: first token after word (contains ·)
    syllable_match = re.search(r'\b(\S*·\S*)\b', r)
    syllables = syllable_match.group(1) if syllable_match else "N/A"

    # IPA: between | ... |
    ipa_match = re.search(r'\|(.+?)\|', r)
    ipa_full = ipa_match.group(1).strip() if ipa_match else "N/A"

    # American pronunciation = first one (before comma)
    ipa_us = ipa_full.split(',')[0].strip()

    # definition: everything after second |
    def_match = re.search(r'\|[^|]+\|\s*(.+)', r, re.DOTALL)
    definition = def_match.group(1).strip()[:300] if def_match else "N/A"

    print(f"Word      : {word}")
    print(f"Syllables : {syllables}")
    print(f"IPA (US)  : {ipa_us}")
    print(f"IPA (all) : {ipa_full}")
    print(f"Definition: {definition}")
    print()

if len(sys.argv) > 1:
    for word in sys.argv[1:]:
        parse(word)
else:
    for line in sys.stdin:
        w = line.strip()
        if w:
            parse(w)
