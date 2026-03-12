import type { ReactNode } from "react";
import { Component } from "react";
import { Pressable, Text, View } from "react-native";

import { recordAppError } from "../../lib/telemetry";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = {
    error: null
  };

  override componentDidCatch(error: Error) {
    void recordAppError(error, {
      boundary: "root"
    });
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  override render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <View className="flex-1 items-center justify-center bg-canvas px-6">
        <View className="w-full max-w-[420px] gap-4 rounded-3xl bg-card p-6">
          <Text className="text-2xl font-bold text-ink">App restart required</Text>
          <Text className="text-sm leading-6 text-muted">
            A runtime error interrupted the current screen. The error has been recorded for Sprint 10 validation.
          </Text>
          <Text className="rounded-2xl bg-ink/5 px-4 py-3 text-sm text-muted">
            {this.state.error.message}
          </Text>
          <Pressable className="rounded-xl bg-ink px-4 py-3" onPress={this.handleReset}>
            <Text className="text-center font-semibold text-white">Retry screen</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}
