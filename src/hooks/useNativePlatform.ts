import { isNative, getPlatform } from "@/lib/native/platform";
import { nativeHapticLight } from "@/lib/native/haptics";

export const hapticTap = () => {
  void nativeHapticLight();
};

export const isNativePlatform = () => isNative();
export const nativePlatform = () => getPlatform();
