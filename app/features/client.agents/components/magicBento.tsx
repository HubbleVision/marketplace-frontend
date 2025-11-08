import React, { useRef, useEffect, useCallback, useState } from "react";
import { gsap } from "gsap";
import { useOverlayState } from "~/components/overlay-state";
import AccountIcon from "~/svg/account";
import "./MagicBento.css";

export interface BentoCardProps {
  id?: string;
  title: string;
  creatorHandle: string;
  network: string;
  networkColor: string;
  price: string;
  priceSuffix: string;
  tags: string[];
  iconText: string;
  iconBackground: string;
  iconColor: string;
}

export interface BentoProps {
  textAutoHide?: boolean;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  cards?: BentoCardProps[];
  emptyStateMessage?: string;
  isLoading?: boolean;
  disableAnimations?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  enableTilt?: boolean;
  glowColor?: string;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
  onClick?: (card: BentoCardProps) => void;
}

const DEFAULT_PARTICLE_COUNT = 12;
const DEFAULT_SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_COLOR = "239, 185, 11";
const MOBILE_BREAKPOINT = 768;

const cardData: BentoCardProps[] = [
  {
    title: "Token Risk Scanner",
    creatorHandle: "@crypto_builder",
    network: "Base",
    networkColor: "#2666FF",
    price: "$0.10/analysis",
    priceSuffix: "via x402",
    tags: ["Base", "Risk Analysis", "GPT4oBase", "Risk Analysis", "GPT4o"],
    iconText: "TR",
    iconBackground: "rgba(38, 102, 255, 0.12)",
    iconColor: "#86b7ff",
  },
  {
    title: "Treasury Guardian",
    creatorHandle: "@defi_keeper",
    network: "Ethereum",
    networkColor: "#8B5CF6",
    price: "$0.25/check",
    priceSuffix: "via Sentinel",
    tags: ["Ethereum", "Treasury", "Fraud Watch", "GPT4o", "Governance"],
    iconText: "TG",
    iconBackground: "rgba(139, 92, 246, 0.12)",
    iconColor: "#c4b5fd",
  },
  {
    title: "Agent Ops Console",
    creatorHandle: "@automation_lab",
    network: "Solana",
    networkColor: "#14F195",
    price: "$0.05/run",
    priceSuffix: "via Orbit",
    tags: ["Solana", "Automation", "Ops", "GPT4o", "Workflows"],
    iconText: "AO",
    iconBackground: "rgba(20, 241, 149, 0.12)",
    iconColor: "#6fffd3",
  },
  {
    title: "Liquidity Whisperer",
    creatorHandle: "@market_mason",
    network: "Arbitrum",
    networkColor: "#49A6FF",
    price: "$0.18/ping",
    priceSuffix: "via Flow",
    tags: ["Arbitrum", "Liquidity", "Signals", "GPT4o", "DEX"],
    iconText: "LW",
    iconBackground: "rgba(73, 166, 255, 0.12)",
    iconColor: "#9cd5ff",
  },
  {
    title: "Compliance Sentinel",
    creatorHandle: "@reg_chain",
    network: "Polygon",
    networkColor: "#A855F7",
    price: "$0.32/audit",
    priceSuffix: "via Axiom",
    tags: ["Polygon", "Compliance", "Monitoring", "GPT4o", "Audit"],
    iconText: "CS",
    iconBackground: "rgba(168, 85, 247, 0.12)",
    iconColor: "#d8b4fe",
  },
  {
    title: "Signal Relay",
    creatorHandle: "@alpha_sync",
    network: "Optimism",
    networkColor: "#FF385C",
    price: "$0.12/pulse",
    priceSuffix: "via Atlas",
    tags: ["Optimism", "Signals", "Market Data", "GPT4o", "Trading"],
    iconText: "SR",
    iconBackground: "rgba(255, 56, 92, 0.12)",
    iconColor: "#ff9aae",
  },
];

const createParticleElement = (
  x: number,
  y: number,
  color: string = DEFAULT_GLOW_COLOR
): HTMLDivElement => {
  const el = document.createElement("div");
  el.className = "particle";
  el.style.cssText = `
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(${color}, 1);
    box-shadow: 0 0 6px rgba(${color}, 0.6);
    pointer-events: none;
    z-index: 100;
    left: ${x}px;
    top: ${y}px;
  `;
  return el;
};

const calculateSpotlightValues = (radius: number) => ({
  proximity: radius * 0.5,
  fadeDistance: radius * 0.75,
});

const updateCardGlowProperties = (
  card: HTMLElement,
  mouseX: number,
  mouseY: number,
  glow: number,
  radius: number
) => {
  const rect = card.getBoundingClientRect();
  const relativeX = ((mouseX - rect.left) / rect.width) * 100;
  const relativeY = ((mouseY - rect.top) / rect.height) * 100;

  card.style.setProperty("--glow-x", `${relativeX}%`);
  card.style.setProperty("--glow-y", `${relativeY}%`);
  card.style.setProperty("--glow-intensity", glow.toString());
  card.style.setProperty("--glow-radius", `${radius}px`);
};

const ParticleCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  disableAnimations?: boolean;
  style?: React.CSSProperties;
  particleCount?: number;
  glowColor?: string;
  enableTilt?: boolean;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
}> = ({
  children,
  className = "",
  disableAnimations = false,
  style,
  particleCount = DEFAULT_PARTICLE_COUNT,
  glowColor = DEFAULT_GLOW_COLOR,
  enableTilt = true,
  clickEffect = false,
  enableMagnetism = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement[]>([]);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const isHoveredRef = useRef(false);
  const memoizedParticles = useRef<HTMLDivElement[]>([]);
  const particlesInitialized = useRef(false);
  const magnetismAnimationRef = useRef<gsap.core.Tween | null>(null);

  const initializeParticles = useCallback(() => {
    if (particlesInitialized.current || !cardRef.current) return;

    const { width, height } = cardRef.current.getBoundingClientRect();
    memoizedParticles.current = Array.from({ length: particleCount }, () =>
      createParticleElement(
        Math.random() * width,
        Math.random() * height,
        glowColor
      )
    );
    particlesInitialized.current = true;
  }, [particleCount, glowColor]);

  const clearAllParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    magnetismAnimationRef.current?.kill();

    particlesRef.current.forEach((particle) => {
      gsap.to(particle, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: "back.in(1.7)",
        onComplete: () => {
          particle.parentNode?.removeChild(particle);
        },
      });
    });
    particlesRef.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    if (!cardRef.current || !isHoveredRef.current) return;

    if (!particlesInitialized.current) {
      initializeParticles();
    }

    memoizedParticles.current.forEach((particle, index) => {
      const timeoutId = setTimeout(() => {
        if (!isHoveredRef.current || !cardRef.current) return;

        const clone = particle.cloneNode(true) as HTMLDivElement;
        cardRef.current.appendChild(clone);
        particlesRef.current.push(clone);

        gsap.fromTo(
          clone,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" }
        );

        gsap.to(clone, {
          x: (Math.random() - 0.5) * 100,
          y: (Math.random() - 0.5) * 100,
          rotation: Math.random() * 360,
          duration: 2 + Math.random() * 2,
          ease: "none",
          repeat: -1,
          yoyo: true,
        });

        gsap.to(clone, {
          opacity: 0.3,
          duration: 1.5,
          ease: "power2.inOut",
          repeat: -1,
          yoyo: true,
        });
      }, index * 100);

      timeoutsRef.current.push(timeoutId);
    });
  }, [initializeParticles]);

  useEffect(() => {
    if (disableAnimations || !cardRef.current) return;

    const element = cardRef.current;

    const handleMouseEnter = () => {
      isHoveredRef.current = true;
      animateParticles();

      if (enableTilt) {
        gsap.to(element, {
          rotateX: 5,
          rotateY: 5,
          duration: 0.3,
          ease: "power2.out",
          transformPerspective: 1000,
        });
      }
    };

    const handleMouseLeave = () => {
      isHoveredRef.current = false;
      clearAllParticles();

      if (enableTilt) {
        gsap.to(element, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.3,
          ease: "power2.out",
        });
      }

      if (enableMagnetism) {
        gsap.to(element, {
          x: 0,
          y: 0,
          duration: 0.3,
          ease: "power2.out",
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!enableTilt && !enableMagnetism) return;

      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      if (enableTilt) {
        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;

        gsap.to(element, {
          rotateX,
          rotateY,
          duration: 0.1,
          ease: "power2.out",
          transformPerspective: 1000,
        });
      }

      if (enableMagnetism) {
        const magnetX = (x - centerX) * 0.05;
        const magnetY = (y - centerY) * 0.05;

        magnetismAnimationRef.current = gsap.to(element, {
          x: magnetX,
          y: magnetY,
          duration: 0.3,
          ease: "power2.out",
        });
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!clickEffect) return;

      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const maxDistance = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - rect.width, y),
        Math.hypot(x, y - rect.height),
        Math.hypot(x - rect.width, y - rect.height)
      );

      const ripple = document.createElement("div");
      ripple.style.cssText = `
        position: absolute;
        width: ${maxDistance * 2}px;
        height: ${maxDistance * 2}px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(${glowColor}, 0.4) 0%, rgba(${glowColor}, 0.2) 30%, transparent 70%);
        left: ${x - maxDistance}px;
        top: ${y - maxDistance}px;
        pointer-events: none;
        z-index: 1000;
      `;

      element.appendChild(ripple);

      gsap.fromTo(
        ripple,
        {
          scale: 0,
          opacity: 1,
        },
        {
          scale: 1,
          opacity: 0,
          duration: 0.8,
          ease: "power2.out",
          onComplete: () => ripple.remove(),
        }
      );
    };

    element.addEventListener("mouseenter", handleMouseEnter);
    element.addEventListener("mouseleave", handleMouseLeave);
    element.addEventListener("mousemove", handleMouseMove);
    element.addEventListener("click", handleClick);

    return () => {
      isHoveredRef.current = false;
      element.removeEventListener("mouseenter", handleMouseEnter);
      element.removeEventListener("mouseleave", handleMouseLeave);
      element.removeEventListener("mousemove", handleMouseMove);
      element.removeEventListener("click", handleClick);
      clearAllParticles();
    };
  }, [
    animateParticles,
    clearAllParticles,
    disableAnimations,
    enableTilt,
    enableMagnetism,
    clickEffect,
    glowColor,
  ]);

  return (
    <div
      ref={cardRef}
      className={`${className} particle-container`}
      style={{ ...style, position: "relative", overflow: "hidden" }}
    >
      {children}
    </div>
  );
};

const GlobalSpotlight: React.FC<{
  gridRef: React.RefObject<HTMLDivElement | null>;
  disableAnimations?: boolean;
  enabled?: boolean;
  spotlightRadius?: number;
  glowColor?: string;
}> = ({
  gridRef,
  disableAnimations = false,
  enabled = true,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  glowColor = DEFAULT_GLOW_COLOR,
}) => {
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const isInsideSection = useRef(false);
  const { isOverlayActive } = useOverlayState();
  const interactionEnabled = enabled && !isOverlayActive;

  useEffect(() => {
    if (disableAnimations || !gridRef?.current || !interactionEnabled) {
      isInsideSection.current = false;
      gridRef?.current
        ?.querySelectorAll(".magic-bento-card")
        .forEach((card) => {
          (card as HTMLElement).style.setProperty("--glow-intensity", "0");
        });
      if (spotlightRef.current) {
        spotlightRef.current.parentNode?.removeChild(spotlightRef.current);
        spotlightRef.current = null;
      }
      return;
    }

    const spotlight = document.createElement("div");
    spotlight.className = "global-spotlight";
    spotlight.style.cssText = `
      position: fixed;
      width: 800px;
      height: 800px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle,
        rgba(${glowColor}, 0.15) 0%,
        rgba(${glowColor}, 0.08) 15%,
        rgba(${glowColor}, 0.04) 25%,
        rgba(${glowColor}, 0.02) 40%,
        rgba(${glowColor}, 0.01) 65%,
        transparent 70%
      );
      z-index: 200;
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: screen;
    `;
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;

    const handleMouseMove = (e: MouseEvent) => {
      if (!spotlightRef.current || !gridRef.current) return;

      const section = gridRef.current.closest(".bento-section");
      const rect = section?.getBoundingClientRect();
      const mouseInside =
        rect &&
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      isInsideSection.current = mouseInside || false;
      const cards = gridRef.current.querySelectorAll(".magic-bento-card");

      if (!mouseInside) {
        gsap.to(spotlightRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: "power2.out",
        });
        cards.forEach((card) => {
          (card as HTMLElement).style.setProperty("--glow-intensity", "0");
        });
        return;
      }

      const { proximity, fadeDistance } =
        calculateSpotlightValues(spotlightRadius);
      let minDistance = Infinity;

      cards.forEach((card) => {
        const cardElement = card as HTMLElement;
        const cardRect = cardElement.getBoundingClientRect();
        const centerX = cardRect.left + cardRect.width / 2;
        const centerY = cardRect.top + cardRect.height / 2;
        const distance =
          Math.hypot(e.clientX - centerX, e.clientY - centerY) -
          Math.max(cardRect.width, cardRect.height) / 2;
        const effectiveDistance = Math.max(0, distance);

        minDistance = Math.min(minDistance, effectiveDistance);

        let glowIntensity = 0;
        if (effectiveDistance <= proximity) {
          glowIntensity = 1;
        } else if (effectiveDistance <= fadeDistance) {
          glowIntensity =
            (fadeDistance - effectiveDistance) / (fadeDistance - proximity);
        }

        updateCardGlowProperties(
          cardElement,
          e.clientX,
          e.clientY,
          glowIntensity,
          spotlightRadius
        );
      });

      gsap.to(spotlightRef.current, {
        left: e.clientX,
        top: e.clientY,
        duration: 0.1,
        ease: "power2.out",
      });

      const targetOpacity =
        minDistance <= proximity
          ? 0.8
          : minDistance <= fadeDistance
            ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.8
            : 0;

      gsap.to(spotlightRef.current, {
        opacity: targetOpacity,
        duration: targetOpacity > 0 ? 0.2 : 0.5,
        ease: "power2.out",
      });
    };

    const handleMouseLeave = () => {
      isInsideSection.current = false;
      gridRef.current?.querySelectorAll(".magic-bento-card").forEach((card) => {
        (card as HTMLElement).style.setProperty("--glow-intensity", "0");
      });
      if (spotlightRef.current) {
        gsap.to(spotlightRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: "power2.out",
        });
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      spotlightRef.current?.parentNode?.removeChild(spotlightRef.current);
    };
  }, [
    gridRef,
    disableAnimations,
    interactionEnabled,
    spotlightRadius,
    glowColor,
  ]);

  return null;
};

const BentoCardGrid: React.FC<{
  children: React.ReactNode;
  gridRef?: React.RefObject<HTMLDivElement | null>;
}> = ({ children, gridRef }) => (
  <div
    className="card-grid bento-section grid auto-rows-fr grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4"
    ref={gridRef}
  >
    {children}
  </div>
);

const CardContent: React.FC<{ card: BentoCardProps; isLoading?: boolean }> = ({
  card,
  isLoading,
}) => {
  const tagLine =
    card.tags.length > 0 ? card.tags.join(" • ") : "No additional metadata";

  if (isLoading) {
    return (
      <div className="flex h-full flex-col animate-pulse">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-full bg-white/10" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-32 rounded-md bg-white/20" />
            <div className="h-3 w-24 rounded-md bg-white/10" />
          </div>
        </div>

        <div className="mt-5 h-7 w-28 rounded-full bg-white/10" />

        <div className="mt-4 h-5 w-36 rounded-md bg-white/10" />

        <div className="mt-auto border-t border-white/10 pt-4 space-y-2">
          <div className="h-3 w-full rounded-md bg-white/10" />
          <div className="h-3 w-2/3 rounded-md bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-4">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold uppercase tracking-wide"
          style={{
            background: card.iconBackground,
            color: card.iconColor,
          }}
        >
          {card.iconText}
        </div>
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold text-white text-left">
            {card.title}
          </h2>
          <p className="mt-1 text-sm text-left flex items-center">
            <AccountIcon className="inline mr-1" />
            <span className="text-[#717171]">By {card.creatorHandle}</span>
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <span
          className="inline-flex items-center rounded-sm px-3 py-1 text-xs font-medium text-white/90 shadow-[0_0_12px_rgba(255,255,255,0.12)]"
          style={{ backgroundColor: card.networkColor }}
        >
          {card.network}
        </span>
      </div>

      <p className="mt-4 text-sm font-medium text-amber-300 text-left">
        {card.price}{" "}
        <span className="font-normal text-amber-200/80">
          {card.priceSuffix}
        </span>
      </p>

      <div className="mt-auto border-t border-white/10 pt-4 text-xs leading-relaxed text-white/60 text-left">
        {tagLine}
      </div>
    </div>
  );
};

const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () =>
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
};

const MagicBento: React.FC<BentoProps> = ({
  textAutoHide = true,
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  cards,
  emptyStateMessage,
  isLoading = false,
  disableAnimations = false,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  particleCount = DEFAULT_PARTICLE_COUNT,
  enableTilt = false,
  glowColor = DEFAULT_GLOW_COLOR,
  clickEffect = false,
  enableMagnetism = true,
  onClick,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobileDetection();
  const shouldDisableAnimations = disableAnimations || isMobile;
  const hasCustomCards = Array.isArray(cards);
  const shouldUseFallbackCards =
    !hasCustomCards || (isLoading && (cards?.length ?? 0) === 0);
  const cardsToRender = shouldUseFallbackCards ? cardData : (cards ?? cardData);
  const showEmptyState =
    hasCustomCards && (cards?.length ?? 0) === 0 && !isLoading;
  const resolvedEmptyStateMessage =
    emptyStateMessage ?? "No items to display right now.";

  return (
    <>
      {enableSpotlight && (
        <GlobalSpotlight
          gridRef={gridRef}
          disableAnimations={shouldDisableAnimations}
          enabled={enableSpotlight}
          spotlightRadius={spotlightRadius}
          glowColor={glowColor}
        />
      )}

      <BentoCardGrid gridRef={gridRef}>
        {cardsToRender.map((card, index) => {
          const cardKey = `${card.title}-${card.creatorHandle}-${index}`;
          const baseClassName = [
            "cursor-pointer",
            "magic-bento-card",
            textAutoHide ? "magic-bento-card--text-autohide" : "",
            enableBorderGlow ? "magic-bento-card--border-glow" : "",
            "flex h-full min-h-[260px] flex-col justify-between rounded-[24px] border border-white/10 bg-white/5 p-6 text-white shadow-[inset_0_0_18px_rgba(255,255,255,0.12)] backdrop-blur-md transition-transform duration-300",
          ]
            .filter(Boolean)
            .join(" ");

          const cardProps = {
            className: baseClassName,
            style: {
              background:
                "linear-gradient(155deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.08) 35%, rgba(255,255,255,0.02) 100%)",
              "--glow-color": glowColor,
            } as React.CSSProperties,
          };

          if (enableStars) {
            return (
              <ParticleCard
                key={cardKey}
                {...cardProps}
                disableAnimations={shouldDisableAnimations}
                particleCount={particleCount}
                glowColor={glowColor}
                enableTilt={enableTilt}
                clickEffect={clickEffect}
                enableMagnetism={enableMagnetism}
              >
                <CardContent card={card} isLoading={isLoading} />
              </ParticleCard>
            );
          }

          return (
            <div
              key={cardKey}
              {...cardProps}
              ref={(el) => {
                if (!el) return;

                const handleMouseMove = (e: MouseEvent) => {
                  if (shouldDisableAnimations) return;

                  const rect = el.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  const centerX = rect.width / 2;
                  const centerY = rect.height / 2;

                  if (enableTilt) {
                    const rotateX = ((y - centerY) / centerY) * -10;
                    const rotateY = ((x - centerX) / centerX) * 10;
                    gsap.to(el, {
                      rotateX,
                      rotateY,
                      duration: 0.1,
                      ease: "power2.out",
                      transformPerspective: 1000,
                    });
                  }

                  if (enableMagnetism) {
                    const magnetX = (x - centerX) * 0.05;
                    const magnetY = (y - centerY) * 0.05;
                    gsap.to(el, {
                      x: magnetX,
                      y: magnetY,
                      duration: 0.3,
                      ease: "power2.out",
                    });
                  }
                };

                const handleMouseLeave = () => {
                  if (shouldDisableAnimations) return;

                  if (enableTilt) {
                    gsap.to(el, {
                      rotateX: 0,
                      rotateY: 0,
                      duration: 0.3,
                      ease: "power2.out",
                    });
                  }

                  if (enableMagnetism) {
                    gsap.to(el, {
                      x: 0,
                      y: 0,
                      duration: 0.3,
                      ease: "power2.out",
                    });
                  }
                };

                const handleClick = (e: MouseEvent) => {
                  if (!clickEffect || shouldDisableAnimations) return;

                  const rect = el.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;

                  // Calculate the maximum distance from click point to any corner
                  const maxDistance = Math.max(
                    Math.hypot(x, y),
                    Math.hypot(x - rect.width, y),
                    Math.hypot(x, y - rect.height),
                    Math.hypot(x - rect.width, y - rect.height)
                  );

                  const ripple = document.createElement("div");
                  ripple.style.cssText = `
                    position: absolute;
                    width: ${maxDistance * 2}px;
                    height: ${maxDistance * 2}px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(${glowColor}, 0.4) 0%, rgba(${glowColor}, 0.2) 30%, transparent 70%);
                    left: ${x - maxDistance}px;
                    top: ${y - maxDistance}px;
                    pointer-events: none;
                    z-index: 1000;
                  `;

                  el.appendChild(ripple);

                  gsap.fromTo(
                    ripple,
                    {
                      scale: 0,
                      opacity: 1,
                    },
                    {
                      scale: 1,
                      opacity: 0,
                      duration: 0.8,
                      ease: "power2.out",
                      onComplete: () => ripple.remove(),
                    }
                  );
                };

                el.addEventListener("mousemove", handleMouseMove);
                el.addEventListener("mouseleave", handleMouseLeave);
                el.addEventListener("click", handleClick);
              }}
              onClick={() => onClick?.(card)}
            >
              <CardContent card={card} isLoading={isLoading} />
            </div>
          );
        })}
      </BentoCardGrid>
      {showEmptyState && (
        <div className="px-4 pb-16 pt-6 text-center text-sm text-white/60">
          {resolvedEmptyStateMessage}
        </div>
      )}
    </>
  );
};

export default MagicBento;
