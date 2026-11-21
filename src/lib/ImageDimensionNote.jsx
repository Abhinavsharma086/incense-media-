import React from "react";

const ImageDimension = {
  // Events
  event: { width: 260, height: 260 },
  eventBanner: { width: 1920, height: 400 },
  eventLogo: { width: 80, height: 80 },
  
  // Academy/Courses
  academy: { width: 400, height: 250 },
  academyBanner: { width: 1920, height: 400 },
  
  // Awards
  award: { width: 400, height: 400 },
  awardBanner: { width: 1920, height: 400 },
  
  // Magazines/Publications
  magazine: { width: 300, height: 400 },
  magazineCover: { width: 300, height: 400 },
  
  // Services
  service: { width: 400, height: 300 },
  serviceBanner: { width: 1920, height: 400 },
  servicePackage: { width: 400, height: 300 },
  serviceOffer: { width: 400, height: 300 },
  
  // Teams
  team: { width: 160, height: 160 },
  teamMember: { width: 160, height: 160 },
  
  // Blogs
  blog: { width: 800, height: 550 },
  blogBanner: { width: 1920, height: 400 },
  
  // Contacts/Company Assets
  favicon: { width: 32, height: 32 },
  logo: { width: 200, height: 50 },
  frontLogo: { width: 200, height: 80 },
  adminLogo: { width: 200, height: 80 },
  
  // Sliders
  slider: { width: 1920, height: 600 },
  
  // Testimonials
  testimonial: { width: 90, height: 90 },
  
  // Clients
  client: { width: 120, height: 120 },
  clientLogo: { width: 120, height: 120 },
  
  // General
  banner: { width: 1920, height: 600 },
  thumbnail: { width: 300, height: 200 },
  profile: { width: 140, height: 140 },

  // Main Images
  covers: { width: 400, height: 500 },
};

const ImageDimensionNote = ({ type, variant }) => {
  if (!type) return null;

  const dimension = ImageDimension[type];

  if (!dimension) return null;

  if (
    typeof dimension.width !== "number" ||
    typeof dimension.height !== "number"
  ) {
    const selected = variant || "primary";
    const nested = dimension[selected];
    if (!nested) return null;

    return (
      <p style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
        Note: Image size - {nested.width} x {nested.height}px
      </p>
    );
  }

  return (
    <p style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
      Note: Image size - {dimension.width} x {dimension.height}px
    </p>
  );
};

export default ImageDimensionNote;
