"use client";

import { useState, useEffect } from "react";

interface DeviceSize {
  small: boolean;
  medium: boolean;
  large: boolean;
}

export function useDevice(): DeviceSize {
  const [deviceSize, setDeviceSize] = useState<DeviceSize>({
    small: false,
    medium: false,
    large: false
  });

  useEffect(() => {
    const updateDeviceSize = () => {
      const width = window.innerWidth;
      
      setDeviceSize({
        small: width < 768,
        medium: width >= 768 && width < 3000,
        large: width >= 3000
      });
    };

    // Initial check
    updateDeviceSize();

    // Listen for window size changes
    window.addEventListener('resize', updateDeviceSize);

    return () => {
      window.removeEventListener('resize', updateDeviceSize);
    };
  }, []);

  return deviceSize;
}