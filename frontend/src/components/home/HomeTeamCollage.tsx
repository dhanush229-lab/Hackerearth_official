import "./HomeTeamCollage.css";

const collagePhotos = [
  { src: "/home-collage/collage-01.webp", alt: "HackerEarth Hub community", position: "50% 52%" },
  { src: "/home-collage/collage-event-group-01.webp", alt: "HackerEarth Hub event group", position: "50% 54%" },
  { src: "/home-collage/collage-03.webp", alt: "HackerEarth Hub community", position: "50% 54%" },
  { src: "/home-collage/collage-04.webp", alt: "HackerEarth Hub community", position: "50% 57%" },
  { src: "/home-collage/collage-05.webp", alt: "HackerEarth Hub community", position: "50% 59%" },
  { src: "/home-collage/collage-06.webp", alt: "HackerEarth Hub community", position: "50% 48%" },
  { src: "/home-collage/collage-07.webp", alt: "HackerEarth Hub community", position: "50% 58%" },
  { src: "/home-collage/collage-08.webp", alt: "DSA learning graphic", position: "50% 50%" },
  { src: "/home-collage/collage-09.webp", alt: "Web design graphic", position: "50% 50%" },
  { src: "/home-collage/collage-10.webp", alt: "Attitude is everything", position: "50% 50%" },
  { src: "/home-collage/collage-11.webp", alt: "HackerEarth Hub full team", position: "50% 64%" },
  { src: "/home-collage/collage-event-group-02.webp", alt: "HackerEarth Hub event group", position: "50% 50%" },
] as const;

const HomeTeamCollage = () => (
  <figure className="home-team-collage">
    <div className="home-team-collage__stage">
      {collagePhotos.map((photo, index) => (
        <div
          key={photo.src}
          className={`home-team-collage__photo home-team-collage__photo--${index + 1}`}
        >
          <img
            src={photo.src}
            alt={photo.alt}
            loading="eager"
            decoding="async"
            style={{ objectPosition: photo.position }}
          />
        </div>
      ))}

      <div className="home-team-collage__logo-anchor">
        <div className="home-team-collage__logo">
          <img
            src="/home-collage/hackerearth-h-mark.png"
            alt="HackerEarth h mark"
            loading="eager"
            decoding="async"
          />
        </div>
      </div>
    </div>

    <figcaption className="sr-only">
      HackerEarth Hub community members gathered around the HackerEarth h mark
    </figcaption>
  </figure>
);

export default HomeTeamCollage;
