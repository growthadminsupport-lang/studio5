function IntroVideo() {
  return (
    <div className="intro-video-section">
      <h2>Introduction to GrowTH</h2>
      <video
        controls
        width="100%"
        poster="/video-poster.jpg"
      >
        <source src="/intro-video.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <p>
        Learn the purpose of GrowTH, its main features, and how to use the
        platform.
      </p>
    </div>
  );
}

export default IntroVideo;