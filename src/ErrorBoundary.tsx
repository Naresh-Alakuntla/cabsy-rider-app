import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@cabsy/shared';

// Catches render-time errors anywhere below it in the tree, logs them, and
// renders a graceful "Something went wrong / Try again" surface instead of
// the white-screen-of-death that React would otherwise produce on a
// crashed render.

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.warn('[ErrorBoundary]', error.message, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            The app hit an unexpected error. Please try again.
          </Text>
          <Pressable style={styles.button} onPress={this.reset}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.bg.primary,
  },
  title: {
    color: colors.ink.primary,
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  message: {
    color: colors.ink.secondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: colors.bg.primary,
    fontWeight: '600',
  },
});
