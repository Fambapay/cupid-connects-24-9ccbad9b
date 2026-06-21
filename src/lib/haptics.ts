import {
  nativeHapticLight,
  nativeHapticMedium,
  nativeHapticHeavy,
  nativeHapticSelection,
  nativeHapticNotification,
} from "./native/haptics";

export const hapticTick = () => {
  void nativeHapticSelection();
};
export const hapticLike = () => {
  void nativeHapticLight();
};
export const hapticPass = () => {
  void nativeHapticLight();
};
export const hapticSuperLike = () => {
  void nativeHapticNotification("success");
};
export const hapticMedium = () => {
  void nativeHapticMedium();
};
export const hapticHeavy = () => {
  void nativeHapticHeavy();
};
