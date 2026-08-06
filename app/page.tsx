'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react';

import { useAuth } from '@hooks/useAuth';
import { getPostLoginRedirect } from '@utils/modules';

const splashSteps = [
  { progress: 25, label: 'Verifying secure session...' },
  { progress: 55, label: 'Loading access permissions...' },
  { progress: 85, label: 'Preparing your workspace...' },
  { progress: 100, label: 'Workspace ready' },
];

export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [splashProgress, setSplashProgress] = useState(0);
  const [splashStatus, setSplashStatus] = useState(
    'Starting secure access...'
  );

  useEffect(() => {
    let currentStep = 0;
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;

    const interval = setInterval(() => {
      const step = splashSteps[currentStep];

      if (step) {
        setSplashProgress(step.progress);
        setSplashStatus(step.label);
        currentStep += 1;
        return;
      }

      clearInterval(interval);

      redirectTimer = setTimeout(() => {
        router.replace(
          user ? getPostLoginRedirect(user) : '/unified-login'
        );
      }, 350);
    }, 450);

    return () => {
      clearInterval(interval);

      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [router, user]);

  const handleEnterPortal = () => {
    router.replace(
      user ? getPostLoginRedirect(user) : '/unified-login'
    );
  };

  const isReady = splashProgress === 100;

  return (
    <main className="landingPage">
      <div className="backgroundPattern" />
      <div className="backgroundGlow glowLeft" />
      <div className="backgroundGlow glowRight" />

      <header className="topHeader">
        <div className="brand">
          <div className="brandLogo">
            <ShieldCheck size={24} strokeWidth={2.2} />
          </div>

          <div className="brandText">
            <strong>MatrixTrack 2.0</strong>
            <span>Unified Operations Platform</span>
          </div>
        </div>
      </header>

      <section className="contentWrapper">
        <div className="introContent">
          <div className="introLabel">
            <span className="liveDot" />
            Secure administrative platform
          </div>

          <h1>
            One platform.
            <br />
            Every operation.
          </h1>

          <p>
            Secure access to assigned workspaces, administrative tools and
            operational dashboards.
          </p>

          <div className="featureList">
            <div className="featureItem">
              <CheckCircle2 size={17} />
              Role-based access
            </div>

            <div className="featureItem">
              <CheckCircle2 size={17} />
              Assigned workspace
            </div>

            <div className="featureItem">
              <CheckCircle2 size={17} />
              Secure authentication
            </div>
          </div>
        </div>

        <div className="launchCard">
          <div className="cardTopLine" />

          <div className="cardBrand">
            <div className="cardBrandIcon">
              <ShieldCheck size={22} strokeWidth={2.3} />
            </div>

            <div>
              <strong>MatrixTrack 2.0</strong>
              <span>Secure workspace access</span>
            </div>
          </div>

          <div className="statusIconWrapper">
            <div className="statusGlow" />

            <div className={`statusIcon ${isReady ? 'ready' : ''}`}>
              {isReady ? (
                <CheckCircle2 size={38} strokeWidth={2.1} />
              ) : (
                <LoaderCircle
                  className="spinner"
                  size={38}
                  strokeWidth={2.1}
                />
              )}
            </div>
          </div>

          <div className="cardContent">
            <span className="eyebrow">Secure gateway</span>

            <h2>
              {isReady
                ? 'Your workspace is ready'
                : 'Preparing your workspace'}
            </h2>

            <p>
              {isReady
                ? 'Continue to your assigned portal.'
                : 'Please wait while we verify your access and prepare your dashboard.'}
            </p>
          </div>

          <div className="progressSection">
            <div className="progressHeading">
              <div>
                <strong>Access setup</strong>
                <span>{splashStatus}</span>
              </div>

              <b>{splashProgress}%</b>
            </div>

            <div
              className="progressTrack"
              role="progressbar"
              aria-valuenow={splashProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="progressFill"
                style={{ width: `${splashProgress}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            className="enterButton"
            onClick={handleEnterPortal}
          >
            Enter portal
            <ArrowRight size={18} />
          </button>

          <div className="secureNote">
            <ShieldCheck size={13} />
            Secure access protected by role and permissions
          </div>
        </div>
      </section>

      <footer className="pageFooter">
        MatrixTrack 2.0 © 2026
      </footer>

      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
        }

        .landingPage {
          position: fixed;
          inset: 0;
          z-index: 99999;
          min-height: 100dvh;
          overflow: auto;
          color: #ffffff;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          background:
            radial-gradient(
              circle at 82% 22%,
              rgba(37, 99, 235, 0.22),
              transparent 34%
            ),
            radial-gradient(
              circle at 18% 82%,
              rgba(14, 165, 233, 0.1),
              transparent 32%
            ),
            linear-gradient(
              135deg,
              #050c18 0%,
              #071426 45%,
              #0b2343 100%
            );
        }

        .backgroundPattern {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.34;
          background-image:
            linear-gradient(
              120deg,
              transparent 0%,
              transparent 48%,
              rgba(96, 165, 250, 0.08) 49%,
              transparent 50%,
              transparent 100%
            ),
            linear-gradient(
              rgba(148, 163, 184, 0.035) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(148, 163, 184, 0.035) 1px,
              transparent 1px
            );
          background-size:
            100% 100%,
            52px 52px,
            52px 52px;
        }

        .backgroundGlow {
          position: absolute;
          pointer-events: none;
          border-radius: 999px;
          filter: blur(20px);
        }

        .glowLeft {
          bottom: -100px;
          left: -70px;
          width: 320px;
          height: 320px;
          background: rgba(30, 64, 175, 0.16);
        }

        .glowRight {
          top: 90px;
          right: -80px;
          width: 340px;
          height: 340px;
          background: rgba(37, 99, 235, 0.15);
        }

        .topHeader {
          position: relative;
          z-index: 2;
          min-height: 86px;
          padding: 18px 4.2%;
          display: flex;
          align-items: center;
          border-bottom: 1px solid rgba(148, 163, 184, 0.12);
          background: rgba(3, 11, 23, 0.58);
          backdrop-filter: blur(16px);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .brandLogo {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          border: 1px solid rgba(147, 197, 253, 0.42);
          border-radius: 15px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          box-shadow: 0 12px 26px rgba(37, 99, 235, 0.25);
        }

        .brandText {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .brandText strong {
          color: #ffffff;
          font-size: 18px;
          font-weight: 850;
          letter-spacing: -0.025em;
        }

        .brandText span {
          color: #8fa2bc;
          font-size: 10px;
          font-weight: 750;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .contentWrapper {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1460px;
          min-height: calc(100dvh - 130px);
          margin: 0 auto;
          padding: 54px 5%;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(380px, 480px);
          align-items: center;
          gap: 8%;
        }

        .introContent {
          max-width: 700px;
        }

        .introLabel {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
          color: #bdd3ef;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .liveDot {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #2dd4bf;
          box-shadow: 0 0 0 7px rgba(45, 212, 191, 0.1);
        }

        .introContent h1 {
          margin: 0;
          color: #ffffff;
          font-size: clamp(46px, 6vw, 78px);
          line-height: 0.98;
          font-weight: 900;
          letter-spacing: -0.055em;
        }

        .introContent p {
          max-width: 650px;
          margin: 28px 0 0;
          color: #a9bbd1;
          font-size: 18px;
          line-height: 1.75;
          font-weight: 500;
        }

        .featureList {
          margin-top: 34px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .featureItem {
          min-height: 42px;
          padding: 0 15px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #d5e4f5;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid rgba(96, 165, 250, 0.18);
          border-radius: 12px;
          background: rgba(9, 30, 56, 0.68);
        }

        .featureItem svg {
          color: #60a5fa;
        }

        .launchCard {
          position: relative;
          width: 100%;
          overflow: hidden;
          padding: 30px;
          color: #172033;
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 25px;
          background: #ffffff;
          box-shadow:
            0 34px 70px rgba(0, 0, 0, 0.28),
            0 10px 26px rgba(15, 23, 42, 0.16);
        }

        .cardTopLine {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(
            90deg,
            #2563eb,
            #60a5fa,
            #2dd4bf
          );
        }

        .cardBrand {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .cardBrandIcon {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          border-radius: 13px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          box-shadow: 0 9px 20px rgba(37, 99, 235, 0.22);
        }

        .cardBrand > div:last-child {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .cardBrand strong {
          color: #172033;
          font-size: 15px;
          font-weight: 850;
        }

        .cardBrand span {
          color: #8997aa;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .statusIconWrapper {
          position: relative;
          width: 82px;
          height: 82px;
          margin: 28px auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .statusGlow {
          position: absolute;
          inset: -14px;
          border-radius: 999px;
          background: radial-gradient(
            circle,
            rgba(37, 99, 235, 0.2),
            transparent 68%
          );
          animation: statusPulse 2.2s ease-in-out infinite;
        }

        .statusIcon {
          position: relative;
          width: 68px;
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          border-radius: 21px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          box-shadow: 0 16px 30px rgba(37, 99, 235, 0.28);
        }

        .statusIcon.ready {
          background: linear-gradient(135deg, #2563eb, #0891b2);
        }

        .spinner {
          animation: spin 1.1s linear infinite;
        }

        .cardContent {
          text-align: center;
        }

        .eyebrow {
          display: block;
          margin-bottom: 7px;
          color: #2563eb;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.11em;
          text-transform: uppercase;
        }

        .cardContent h2 {
          margin: 0;
          color: #111827;
          font-size: 25px;
          line-height: 1.2;
          font-weight: 900;
          letter-spacing: -0.035em;
        }

        .cardContent p {
          max-width: 355px;
          margin: 10px auto 0;
          color: #718096;
          font-size: 13px;
          line-height: 1.65;
          font-weight: 550;
        }

        .progressSection {
          margin-top: 25px;
          padding: 16px;
          border: 1px solid #dce5f1;
          border-radius: 15px;
          background: #f4f7fb;
        }

        .progressHeading {
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .progressHeading > div {
          min-width: 0;
        }

        .progressHeading strong {
          display: block;
          margin-bottom: 3px;
          color: #334155;
          font-size: 11px;
          font-weight: 850;
        }

        .progressHeading span {
          display: block;
          overflow: hidden;
          color: #8492a6;
          font-size: 10px;
          font-weight: 650;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .progressHeading b {
          flex-shrink: 0;
          color: #2563eb;
          font-size: 13px;
          font-weight: 900;
        }

        .progressTrack {
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: #dce4ef;
        }

        .progressFill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #2563eb, #3b82f6);
          box-shadow: 0 0 10px rgba(37, 99, 235, 0.25);
          transition: width 0.45s ease;
        }

        .enterButton {
          width: 100%;
          min-height: 50px;
          margin-top: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: #ffffff;
          font-size: 13px;
          font-weight: 850;
          border: 0;
          border-radius: 13px;
          cursor: pointer;
          background: linear-gradient(135deg, #274fc7, #2563eb);
          box-shadow: 0 13px 24px rgba(37, 99, 235, 0.23);
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease;
        }

        .enterButton:hover {
          transform: translateY(-2px);
          box-shadow: 0 17px 28px rgba(37, 99, 235, 0.3);
        }

        .enterButton:active {
          transform: translateY(0);
        }

        .secureNote {
          margin-top: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: #94a3b8;
          font-size: 9px;
          font-weight: 700;
        }

        .pageFooter {
          position: absolute;
          right: 4.2%;
          bottom: 20px;
          z-index: 2;
          color: #7890ad;
          font-size: 9px;
          font-weight: 700;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes statusPulse {
          0%,
          100% {
            opacity: 0.65;
            transform: scale(0.94);
          }

          50% {
            opacity: 1;
            transform: scale(1.08);
          }
        }

        @media (max-width: 980px) {
          .contentWrapper {
            grid-template-columns: 1fr;
            gap: 42px;
            padding-top: 45px;
            padding-bottom: 70px;
          }

          .introContent {
            max-width: 650px;
            margin: 0 auto;
            text-align: center;
          }

          .introLabel {
            justify-content: center;
          }

          .introContent p {
            margin-left: auto;
            margin-right: auto;
          }

          .featureList {
            justify-content: center;
          }

          .launchCard {
            max-width: 480px;
            margin: 0 auto;
          }

          .pageFooter {
            position: relative;
            right: auto;
            bottom: auto;
            padding: 0 0 20px;
            text-align: center;
          }
        }

        @media (max-width: 600px) {
          .topHeader {
            min-height: 74px;
            padding: 14px 18px;
          }

          .brandLogo {
            width: 43px;
            height: 43px;
          }

          .brandText strong {
            font-size: 16px;
          }

          .brandText span {
            font-size: 8px;
          }

          .contentWrapper {
            min-height: auto;
            padding: 34px 16px 54px;
          }

          .introContent h1 {
            font-size: 43px;
          }

          .introContent p {
            margin-top: 20px;
            font-size: 15px;
          }

          .featureList {
            display: none;
          }

          .launchCard {
            padding: 24px 20px;
            border-radius: 21px;
          }

          .statusIconWrapper {
            margin-top: 24px;
          }

          .cardContent h2 {
            font-size: 23px;
          }
        }

        @media (max-height: 760px) and (min-width: 981px) {
          .topHeader {
            min-height: 74px;
            padding-top: 13px;
            padding-bottom: 13px;
          }

          .contentWrapper {
            min-height: calc(100dvh - 100px);
            padding-top: 26px;
            padding-bottom: 32px;
          }

          .introContent h1 {
            font-size: clamp(42px, 5vw, 68px);
          }

          .introContent p {
            margin-top: 20px;
            font-size: 16px;
          }

          .featureList {
            margin-top: 24px;
          }

          .launchCard {
            padding: 25px;
          }

          .statusIconWrapper {
            margin-top: 20px;
            margin-bottom: 14px;
          }

          .progressSection {
            margin-top: 19px;
          }
        }
      `}</style>
    </main>
  );
}