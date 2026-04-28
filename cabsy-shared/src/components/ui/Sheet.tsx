import React, { forwardRef, useMemo } from 'react';
import BottomSheet, { BottomSheetProps } from '@gorhom/bottom-sheet';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';

export interface SheetProps extends Omit<BottomSheetProps, 'snapPoints'> {
  snapPoints?: Array<string | number>;
  children: React.ReactNode;
}

const DEFAULT_SNAP_POINTS = ['30%', '70%', '90%'];

export const Sheet = forwardRef<BottomSheet, SheetProps>(
  ({ snapPoints, children, ...rest }, ref) => {
    const points = useMemo(
      () => snapPoints ?? DEFAULT_SNAP_POINTS,
      [snapPoints],
    );

    return (
      <BottomSheet
        ref={ref}
        snapPoints={points}
        handleIndicatorStyle={{
          backgroundColor: '#D5D5DA',
          width: 44,
          height: 4,
        }}
        backgroundStyle={{
          backgroundColor: colors.bg.elevated,
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
          shadowColor: colors.shadow.color,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 16,
        }}
        {...rest}
      >
        {children}
      </BottomSheet>
    );
  },
);

Sheet.displayName = 'Sheet';
