import React from "react";
import { img_path } from "../../../environment";

interface Image {
  className?: string;
  src: string;
  alt?: string;
  height?: number;
  width?: number;
  id?: string;
  isLink?: boolean;
  style?: React.CSSProperties;
}

const ImageWithBasePath = (props: Image) => {
  // Determine if we should use the source as-is or prepend img_path
  let fullSrc = props.src;

  // Handle undefined or null src - use a default placeholder
  if (!fullSrc) {
    fullSrc = 'assets/img/profiles/avatar-01.jpg';
  }

  if (!props.isLink) {
    // Check if src is already a full URL (http/https) or data URL
    const isFullUrl = /^(https?:\/\/|data:)/i.test(fullSrc);

    // Check if src already starts with img_path (to avoid double prepending)
    const alreadyHasBasePath = fullSrc?.startsWith(img_path);

    // Only prepend img_path if it's not a full URL and doesn't already have the base path
    if (!isFullUrl && !alreadyHasBasePath) {
      fullSrc = `${img_path}${fullSrc}`;
    }
  }

  return (
    <img
      className={props.className}
      src={fullSrc}
      height={props.height}
      alt={props.alt}
      width={props.width}
      id={props.id}
      style={props.style}
    />
  );
};

export default ImageWithBasePath;
