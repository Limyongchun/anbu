import { ExpoConfig, ConfigContext } from "expo/config";

const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";

const googleReversedClientId = GOOGLE_IOS_CLIENT_ID
  ? GOOGLE_IOS_CLIENT_ID.split(".").reverse().join(".")
  : "";

const config: ExpoConfig = {
  name: "ANBU",
  slug: "anbu",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "anbu",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#7A5454",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.anbu.family",
    usesAppleSignIn: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "가족의 안전을 위해 현재 위치를 공유합니다.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "앱이 꺼져 있어도 가족에게 위치를 안전하게 공유하기 위해 백그라운드 위치 접근이 필요합니다.",
      NSLocationAlwaysUsageDescription:
        "앱이 꺼져 있어도 가족에게 위치를 안전하게 공유하기 위해 백그라운드 위치 접근이 필요합니다.",
      NSCameraUsageDescription:
        "가족에게 보낼 사진을 촬영하기 위해 카메라 접근이 필요합니다.",
      NSPhotoLibraryUsageDescription:
        "가족에게 보낼 사진을 선택하기 위해 사진 라이브러리 접근이 필요합니다.",
      ITSAppUsesNonExemptEncryption: false,
      UIBackgroundModes: ["location", "fetch"],
      ...(googleReversedClientId
        ? {
            CFBundleURLTypes: [
              {
                CFBundleURLSchemes: [googleReversedClientId],
              },
            ],
          }
        : {}),
    },
  },
  android: {
    package: "com.anbu.family",
    versionCode: 1,
    permissions: [
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_BACKGROUND_LOCATION",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_LOCATION",
      "android.permission.CAMERA",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.RECORD_AUDIO",
    ],
  },
  web: {
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    ["expo-router", { origin: "https://replit.com/" }],
    "expo-font",
    "expo-web-browser",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "앱이 꺼져 있어도 가족에게 위치를 안전하게 공유하기 위해 백그라운드 위치 접근이 필요합니다.",
        locationAlwaysPermission:
          "앱이 꺼져 있어도 가족에게 위치를 안전하게 공유하기 위해 백그라운드 위치 접근이 필요합니다.",
        locationWhenInUsePermission:
          "가족의 안전을 위해 현재 위치를 공유합니다.",
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "가족에게 보낼 사진을 선택하기 위해 사진 라이브러리 접근이 필요합니다.",
        cameraPermission:
          "가족에게 보낼 사진을 촬영하기 위해 카메라 접근이 필요합니다.",
      },
    ],
    [
      "expo-build-properties",
      {
        ios: {
          deploymentTarget: "15.1",
        },
      },
    ],
    "expo-apple-authentication",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: "3045eabf-f1c9-4d48-acd2-b84484aa5c63",
    },
  },
  owner: "atrees",
};

export default ({ config: _config }: ConfigContext): ExpoConfig => config;
