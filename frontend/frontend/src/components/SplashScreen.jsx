import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
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