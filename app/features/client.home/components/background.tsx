import { useCallback, useState } from "react";
import { useMount } from "~/hooks/useMount";
import PixelBlast from "./PixelBlast";

const Background = () => {
  const isMounted = useMount();
  const [isPixelBlastReady, setPixelBlastReady] = useState(false);
  const handlePixelBlastReady = useCallback(() => {
    setPixelBlastReady(true);
  }, []);
  return (
    <div
      style={{
        width: "100%",
        height: "600px",
        position: "absolute",
        top: 0,
        left: 0,
        overflow: "hidden",
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.6) 100%)",
          opacity: isPixelBlastReady ? 0 : 1,
          transition: "opacity 300ms ease",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      {isMounted && (
        <PixelBlast
          variant="square"
          pixelSize={4}
          color="#00d2b1"
          patternScale={5.75}
          patternDensity={0.75}
          pixelSizeJitter={0.8}
          enableRipples={false}
          rippleSpeed={0.4}
          rippleThickness={0.1}
          rippleIntensityScale={1.5}
          liquid={false}
          liquidStrength={0.12}
          liquidRadius={1.2}
          liquidWobbleSpeed={5}
          speed={0.5}
          edgeFade={0.2}
          transparent={false}
          className=""
          onReady={handlePixelBlastReady}
          style={{}}
        />
      )}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(180deg, #000 0%, rgba(0, 0, 0, 0.00) 70.9%)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />
    </div>
  );
};

export default Background;
