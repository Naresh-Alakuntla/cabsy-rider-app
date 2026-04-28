import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import {
  autocomplete,
  placeDetails,
  PlacesError,
  type PlaceDetails,
  type PlacePrediction,
} from '../../lib/places';
import { Input } from './Input';
import { Body, Caption } from './Text';

const DEBOUNCE_MS = 250;
const ROW_MIN_HEIGHT = 44;

export interface PlacesAutocompleteInputProps {
  label?: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (place: PlaceDetails) => void;
  nearLat?: number;
  nearLng?: number;
  sessionToken: string;
  disabled?: boolean;
  onUnavailable?: () => void;
}

export const PlacesAutocompleteInput: React.FC<
  PlacesAutocompleteInputProps
> = ({
  label,
  placeholder,
  value,
  onChangeText,
  onSelect,
  nearLat,
  nearLng,
  sessionToken,
  disabled,
  onUnavailable,
}) => {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const [open, setOpen] = useState(false);
  const [resolving, setResolving] = useState(false);

  const reqIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResolvedRef = useRef<string | null>(null);
  const onUnavailableRef = useRef(onUnavailable);
  useEffect(() => {
    onUnavailableRef.current = onUnavailable;
  }, [onUnavailable]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (noKey) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const trimmed = value.trim();

    // If value matches the just-resolved address, suppress further searches.
    if (lastResolvedRef.current && lastResolvedRef.current === value) {
      setPredictions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    if (trimmed.length < 2) {
      setPredictions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const id = ++reqIdRef.current;
    debounceRef.current = setTimeout(() => {
      autocomplete(trimmed, {
        sessionToken,
        nearLat,
        nearLng,
      })
        .then((results) => {
          if (id !== reqIdRef.current) return;
          setPredictions(results);
          setOpen(results.length > 0);
          setLoading(false);
        })
        .catch((e: unknown) => {
          if (id !== reqIdRef.current) return;
          setLoading(false);
          if (e instanceof PlacesError && e.code === 'NO_KEY') {
            setNoKey(true);
            setPredictions([]);
            setOpen(false);
            onUnavailableRef.current?.();
            return;
          }
          // Network or API error: hide dropdown silently. The Input still
          // accepts typed text so the user is not blocked.
          setPredictions([]);
          setOpen(false);
        });
    }, DEBOUNCE_MS);
  }, [value, sessionToken, nearLat, nearLng, noKey]);

  const handleSelect = useCallback(
    async (prediction: PlacePrediction) => {
      if (resolving) return;
      setResolving(true);
      try {
        const details = await placeDetails(prediction.placeId, {
          sessionToken,
        });
        lastResolvedRef.current = details.address;
        onChangeText(details.address);
        setPredictions([]);
        setOpen(false);
        onSelect(details);
      } catch (e) {
        if (e instanceof PlacesError && e.code === 'NO_KEY') {
          setNoKey(true);
          onUnavailableRef.current?.();
        }
        // On any other failure leave the dropdown closed; the user can retry.
        setOpen(false);
      } finally {
        setResolving(false);
      }
    },
    [onChangeText, onSelect, resolving, sessionToken],
  );

  const showDropdown = open && !noKey && predictions.length > 0;
  const showSpinner = (loading || resolving) && !noKey;

  return (
    <View>
      <View style={styles.inputWrap}>
        <Input
          label={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          editable={!disabled}
        />
        {showSpinner ? (
          <View style={styles.spinner} pointerEvents="none">
            <ActivityIndicator
              size="small"
              color={colors.ink.secondary}
            />
          </View>
        ) : null}
      </View>

      {noKey ? (
        <Caption color="danger" style={styles.notice}>
          Address search unavailable. Type the address manually.
        </Caption>
      ) : null}

      {showDropdown ? (
        <View style={styles.dropdown}>
          {predictions.map((p, idx) => (
            <Pressable
              key={p.placeId}
              onPress={() => handleSelect(p)}
              accessibilityRole="button"
              accessibilityLabel={p.description}
              style={({ pressed }) => [
                styles.row,
                idx > 0 ? styles.rowDivider : null,
                pressed ? styles.rowPressed : null,
              ]}
              hitSlop={4}
              disabled={disabled || resolving}
            >
              <Body color="primary" numberOfLines={1}>
                {p.mainText}
              </Body>
              {p.secondaryText.length > 0 ? (
                <Caption color="secondary" numberOfLines={1}>
                  {p.secondaryText}
                </Caption>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  inputWrap: {
    position: 'relative',
  },
  spinner: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  notice: {
    marginTop: spacing.xs,
  },
  dropdown: {
    marginTop: spacing.xs,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: 'hidden',
  },
  row: {
    minHeight: ROW_MIN_HEIGHT,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  rowPressed: {
    backgroundColor: colors.bg.surface,
  },
});
