import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, fonts, radii, spacing, typography } from '../constants/theme';
import type { DocumentAnalysis, ExtractedField } from '../documentIntelligence';
import { Text, TextInput } from './AppText';

type Props = {
  analysis: DocumentAnalysis | null;
  onCorrectField: (fieldKey: string, value: string) => Promise<void>;
};

function confidenceLabel(confidence: number): string {
  const pct = Math.round(confidence * 100);
  if (pct >= 85) {
    return `${pct}% high`;
  }
  if (pct >= 60) {
    return `${pct}% medium`;
  }
  return `${pct}% low`;
}

function documentTypeLabel(type: string): string {
  return type.replace(/_/g, ' ');
}

export function ExtractedFieldsEditor({ analysis, onCorrectField }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!analysis) {
      setDrafts({});
      return;
    }
    const next: Record<string, string> = {};
    for (const field of analysis.fields) {
      next[field.key] = field.value;
    }
    setDrafts(next);
  }, [analysis]);

  if (!analysis || analysis.documentType === 'unknown') {
    return null;
  }

  const saveField = async (field: ExtractedField) => {
    const nextValue = (drafts[field.key] ?? field.value).trim();
    if (!nextValue || nextValue === field.value) {
      return;
    }
    setSavingKey(field.key);
    try {
      await onCorrectField(field.key, nextValue);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>EXTRACTED FIELDS</Text>
      <Text style={styles.docType}>
        Detected as {documentTypeLabel(analysis.documentType)} ·{' '}
        {confidenceLabel(analysis.documentConfidence)}
      </Text>

      {analysis.fields.length === 0 ? (
        <Text style={styles.empty}>
          No structured fields yet. Edit OCR text or re-read to improve extraction.
        </Text>
      ) : (
        analysis.fields.map(field => (
          <View key={field.key} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <Text
                style={[
                  styles.confidence,
                  field.confidence < 0.6 && styles.confidenceLow,
                ]}>
                {confidenceLabel(field.confidence)}
                {field.validated ? '' : ' · check'}
              </Text>
            </View>
            <TextInput
              value={drafts[field.key] ?? field.value}
              onChangeText={text =>
                setDrafts(prev => ({ ...prev, [field.key]: text }))
              }
              onBlur={() => {
                saveField(field).catch(() => undefined);
              }}
              style={styles.input}
              placeholderTextColor={colors.muted}
            />
            {(drafts[field.key] ?? '') !== field.value ? (
              <Pressable
                style={styles.save}
                disabled={savingKey === field.key}
                onPress={() => {
                  saveField(field).catch(() => undefined);
                }}>
                <Text style={styles.saveText}>
                  {savingKey === field.key ? 'Saving…' : 'Save correction'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.sm,
  },
  label: {
    ...typography.eyebrow,
    marginTop: 24,
    marginBottom: 8,
  },
  docType: {
    color: colors.secondary,
    fontSize: 13,
    marginBottom: spacing.md,
    textTransform: 'capitalize',
  },
  empty: {
    color: colors.muted,
    fontSize: 13,
  },
  row: {
    marginBottom: spacing.lg,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    color: colors.primary,
    fontFamily: fonts.semiBold,
    fontSize: 13,
  },
  confidence: {
    color: colors.muted,
    fontSize: 11,
    fontFamily: fonts.medium,
  },
  confidenceLow: {
    color: colors.danger,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
    color: colors.primary,
    paddingVertical: 8,
    fontSize: 15,
  },
  save: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: colors.softAccent,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  saveText: {
    color: colors.primary,
    fontFamily: fonts.semiBold,
    fontSize: 12,
  },
});
