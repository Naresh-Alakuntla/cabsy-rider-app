# React Native + library keep rules for release-mode (R8) builds.
#
# RN core, Hermes, Firebase, and Google Maps each ship their own
# `consumer-rules.pro` so most keeps are inherited automatically. This file
# adds defensive keeps for libraries that don't, plus Cabsy-specific rules.

# --- Keep stack-trace info for prod debugging ---
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*

# --- Hermes / RN bridge ---
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# --- Socket.IO / OkHttp (used transitively by socket.io-client native side) ---
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn org.conscrypt.**

# --- Google Play Services / Maps / Places (defensive — usually covered) ---
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# --- Firebase (defensive) ---
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# --- @react-native-firebase modules ---
-keep class io.invertase.firebase.** { *; }
-dontwarn io.invertase.firebase.**

# --- react-native-maps ---
-keep class com.airbnb.android.react.maps.** { *; }
-dontwarn com.airbnb.android.react.maps.**

# --- Reanimated / Worklets (uses runtime reflection) ---
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }
-dontwarn com.swmansion.**

# --- Don't strip line numbers in release crash reports ---
-renamesourcefileattribute SourceFile
