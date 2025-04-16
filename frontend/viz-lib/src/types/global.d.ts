// Tell TypeScript to ignore type checking for the leaflet module
declare module 'leaflet' {
  // This empty declaration will make TypeScript less strict about checking this module
  const _: any;
  export = _;
}

// Also handle the CSS imports if needed
declare module '*.css' {
  const content: any;
  export default content;
}

declare module '*.less' {
  const content: any;
  export default content;
}
