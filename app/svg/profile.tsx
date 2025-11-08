import * as React from "react";

const Profile = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    {...props}
  >
    <rect
      width="48"
      height="48"
      rx="24"
      fill="url(#pattern0_17_5252)"
    />
    <defs>
      <pattern
        id="pattern0_17_5252"
        patternContentUnits="objectBoundingBox"
        width="1"
        height="1"
      >
        <use
          xlinkHref="#image0_17_5252"
          transform="scale(0.03125)"
        />
      </pattern>
      <image
        id="image0_17_5252"
        width="32"
        height="32"
        preserveAspectRatio="none"
        xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAAAr0lEQVRYCe3XsRGAIAwFUPHs7BnAWSx1A3tncg9LZ3EAe2v02yuQfI8maeH4jyDc6cLkQ1Ww6oLZT7QBrAPWgSZ2Deft+JwydG217ufrnKX3r2MYUB/BeAOAkJYagGANggLQIGgAKYIKkCDogFxE9BpiQUnhw0wpNeDrnUi5nr8cAXaO8JQu/AJIDQeUDsgJpwNyw6kASTgNIA2nADThADj7L0AbShb9HcjdjAGsAxdTBxp84bR63gAAAABJRU5ErkJggg=="
      />
    </defs>
  </svg>
);
export default Profile;
