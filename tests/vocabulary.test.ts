import { describe, expect, it } from 'vitest';
import { dictionaryGradeToLevel, nextVocabularyReview, sentenceCloze, vocabularyLoadError } from '../src/lib/vocabulary';
import { importPageDisposition, parseKrdictExamples, parseKrdictSearch } from '../scripts/import-krdict';

describe('vocabulary grading and scheduling', () => {
  it('keeps unknown dictionary grades unclassified and never maps TOPIK', () => {
    expect(dictionaryGradeToLevel('초급')).toBe('beginner');
    expect(dictionaryGradeToLevel('중급')).toBe('intermediate');
    expect(dictionaryGradeToLevel('고급')).toBe('advanced');
    expect(dictionaryGradeToLevel('TOPIK 3')).toBe('unclassified');
    expect(dictionaryGradeToLevel(undefined)).toBe('unclassified');
  });

  it('schedules a transparent five-step review and short retry on a miss', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    expect(nextVocabularyReview(0, true, now)).toEqual({ familiarity: 1, nextReviewAt: '2026-01-02T00:00:00.000Z', mastered: false });
    expect(nextVocabularyReview(4, true, now).mastered).toBe(true);
    expect(nextVocabularyReview(4, false, now)).toEqual({ familiarity: 3, nextReviewAt: '2026-01-01T00:10:00.000Z', mastered: false });
  });

  it('only creates sentence exercises when the exact headword is present', () => {
    expect(sentenceCloze('저는 학교에 갑니다.', '학교')).toBe('저는 ＿＿＿에 갑니다.');
    expect(sentenceCloze('저는 학생입니다.', '학교')).toBeNull();
  });

  it('reports a missing remote vocabulary migration as an actionable setup error', () => {
    expect(vocabularyLoadError({ code: 'PGRST205', message: 'schema cache miss' })).toContain('202611070001_vocabulary.sql');
  });
});

describe('KRDICT XML normalization', () => {
  it('preserves source grade and optional English meaning while tolerating absent fields', () => {
    const parsed = parseKrdictSearch(`<channel><total>1</total><start>1</start><item><target_code>100</target_code><word>사랑</word><word_grade>초급</word_grade><pronunciation>사랑</pronunciation><pos>명사</pos><sense><sense_order>1</sense_order><definition>아끼고 소중히 여기는 마음.</definition><translation><trans_lang>영어</trans_lang><trans_word>love</trans_word></translation></sense></item></channel>`);
    expect(parsed.entries[0]).toMatchObject({ code: '100', word: '사랑', grade: '초급', pronunciation: '사랑' });
    expect(parsed.entries[0].senses[0]).toMatchObject({ order: 1, translation: 'love' });
    expect(parseKrdictSearch(`<channel><total>0</total><start>1</start></channel>`).entries).toEqual([]);
  });

  it('normalizes Korean examples and leaves translations absent when unsupported', () => {
    expect(parseKrdictExamples(`<view><example_info><example>사랑은 언제나 기쁨을 준다.</example></example_info></view>`))
      .toEqual([{ sentence: '사랑은 언제나 기쁨을 준다.', translation: null }]);
  });

  it('handles result paging and reports the documented start cap as incomplete', () => {
    expect(importPageDisposition(1, 100, 250, 100)).toEqual({ nextStart: 101, capped: false, complete: false });
    expect(importPageDisposition(201, 100, 250, 50)).toEqual({ nextStart: 251, capped: false, complete: true });
    expect(importPageDisposition(901, 100, 1400, 100)).toEqual({ nextStart: 1001, capped: true, complete: false });
  });
});
