// components/Atmosphere.jsx — single shared ambient background layer.
// Mounted once at the app root (see App.jsx) so its cost is paid exactly
// once regardless of which screen is active. Pure decoration: fixed,
// behind all content, non-interactive. See tokens.css for the actual
// vignette/fog/dust-mote rules — this component just provides the markup.
export function Atmosphere() {
  return (
    <div className="atmosphere" aria-hidden="true">
      <div className="atmosphere__fog" />
      <div className="atmosphere__motes" />
      <div className="atmosphere__vignette" />
    </div>
  );
}

export default Atmosphere;
