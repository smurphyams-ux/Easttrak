
import React from 'react';

function App() {
  const openAppStore = () => {
    window.open('https://apps.apple.com', '_blank');
  };

  const openPlayStore = () => {
    window.open('https://play.google.com', '_blank');
  };

  return (
    <div className="container">
      <div className="content">
        <div className="icon" style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
          <img src="/EZTrakLogo-fancy.svg" alt="EZTrak Logo" style={{ width: 200, height: 50, display: 'block' }} />
        </div>
        <div className="subtitle">Mobile App</div>

        <div className="messageBox">
          <div className="message">
            This application is designed for mobile devices.
          </div>
          <div className="message">
            Please download the app on your iOS or Android device for the full experience.
          </div>
        </div>

        <div className="buttonContainer">
          <button className="button iosButton" onClick={openAppStore}>
            📱 Download for iOS
          </button>
          <button className="button androidButton" onClick={openPlayStore}>
            🤖 Download for Android
          </button>
        </div>

        <div className="expoInfo">
          <div className="expoText">
            For developers: Scan the QR code in your terminal with Expo Go to test the app.
          </div>
        </div>
      </div>
      <style>{`
        .container {
          min-height: 100vh;
          background-color: #f5f5f5;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .content {
          max-width: 600px;
          width: 90%;
          padding: 40px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .icon {
          font-size: 80px;
          margin-bottom: 20px;
        }
        .title {
          font-size: 36px;
          font-weight: bold;
          color: #333;
          margin-bottom: 8px;
          text-align: center;
        }
        .subtitle {
          font-size: 20px;
          color: #666;
          margin-bottom: 30px;
          text-align: center;
        }
        .messageBox {
          background: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
          border-left: 4px solid #007AFF;
        }
        .message {
          font-size: 16px;
          color: #444;
          text-align: center;
          margin-bottom: 10px;
          line-height: 24px;
        }
        .buttonContainer {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .button {
          padding: 15px 30px;
          border-radius: 8px;
          border: none;
          color: white;
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 0;
          cursor: pointer;
        }
        .iosButton {
          background: #007AFF;
        }
        .androidButton {
          background: #3DDC84;
        }
        .expoInfo {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
        }
        .expoText {
          font-size: 14px;
          color: #888;
          text-align: center;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}

export default App;







































