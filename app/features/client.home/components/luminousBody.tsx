const LuminousBody = () => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "50%",
        height: "100%",
        borderRadius: "9999px",
        opacity: "0.3",
        background: "linear-gradient(90deg, #00D2B1 0%, #EFB90B 100%)",
        filter: "blur(100px)",
        pointerEvents: "none",
      }}
    ></div>
  );
};

export default LuminousBody;
