import React from "react";
import { StyleSheet, View } from "react-native";
import { PhotoSlide } from "./PhotoSlide";
import { TextSlide } from "./TextSlide";
import type { Slide } from "@/logic/useSlideshow";

export function RenderSlide({ slide }: { slide: Slide | null }) {
  if (!slide) return <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#000" }]} />;
  if (slide.kind === "msg" && slide.msg.photoData) return <PhotoSlide msg={slide.msg} />;
  return <TextSlide slide={slide} />;
}
