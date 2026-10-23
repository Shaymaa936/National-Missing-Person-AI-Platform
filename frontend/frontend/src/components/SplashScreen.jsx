import React from 'react';
import { DotLottieReact, setWasmUrl } from '@lottiefiles/dotlottie-react';
// Bundle the animation player with the site instead of downloading it from a
// CDN (jsdelivr/unpkg) at runtime, so the splash also works offline / on slow
// or filtered networks.
import dotLottieWasmUrl from '@lottiefiles/dotlottie-web/dotlottie-player.wasm?url';

setWasmUrl(dotLottieWasmUrl);
import './SplashScreen.css';

import locationAnimation from '../assets/Location_Lottie_Animation.lottie/animations/12345.json';

const SplashScreen = () => {
  return (
    <div className="splash-screen">
      <DotLottieReact
        data={JSON.stringify(locationAnimation)}
        loop
        autoplay
        style={{ width: 200, height: 200 }}
      />
    </div>
  );
};

export default SplashScreen;