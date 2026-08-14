let installed = false;

const STYLE_ID = 'riskmulate-tablet-held-viewmodel';

function buildGrip(side) {
  const grip = document.createElement('div');
  grip.className = `tablet-hand-grip tablet-hand-grip-${side}`;
  grip.setAttribute('aria-hidden', 'true');

  const sleeve = document.createElement('span');
  sleeve.className = 'tablet-hand-sleeve';
  grip.appendChild(sleeve);

  const cuff = document.createElement('span');
  cuff.className = 'tablet-hand-cuff';
  grip.appendChild(cuff);

  const palm = document.createElement('span');
  palm.className = 'tablet-hand-palm';
  grip.appendChild(palm);

  const knuckle = document.createElement('span');
  knuckle.className = 'tablet-hand-knuckle';
  grip.appendChild(knuckle);

  for (let index = 0; index < 4; index += 1) {
    const finger = document.createElement('span');
    finger.className = `tablet-hand-finger tablet-hand-finger-${index + 1}`;
    palm.appendChild(finger);
  }

  const thumb = document.createElement('span');
  thumb.className = 'tablet-hand-thumb';
  palm.appendChild(thumb);
  return grip;
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.tablet-hand-grip{
  position:absolute;
  z-index:30;
  bottom:74px;
  width:108px;
  height:220px;
  pointer-events:none;
  opacity:0;
  filter:drop-shadow(0 14px 16px rgba(0,0,0,.36));
  transform-origin:50% 100%;
  transition:opacity .14s ease,transform .34s cubic-bezier(.18,.76,.18,1);
}
.tablet-hand-grip-left{left:-70px;transform:translate3d(-38px,150px,0) rotate(19deg)}
.tablet-hand-grip-right{right:-70px;transform:translate3d(38px,150px,0) rotate(-19deg)}
.tablet.open .tablet-hand-grip{opacity:1}
.tablet.open .tablet-hand-grip-left{transform:translate3d(0,0,0) rotate(8deg)}
.tablet.open .tablet-hand-grip-right{transform:translate3d(0,0,0) rotate(-8deg)}
.tablet-hand-sleeve{
  position:absolute;
  left:25px;
  bottom:0;
  width:58px;
  height:144px;
  border-radius:30px 30px 20px 20px;
  background:
    linear-gradient(90deg,rgba(255,255,255,.05),transparent 24% 68%,rgba(0,0,0,.22)),
    linear-gradient(180deg,#4e5b60,#344047 56%,#2a3439);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.035),inset -12px 0 18px rgba(0,0,0,.16);
}
.tablet-hand-sleeve::after{
  content:"";
  position:absolute;
  left:0;
  right:0;
  top:20px;
  height:8px;
  background:linear-gradient(180deg,#d8b23c,#a77e1d);
  box-shadow:0 1px 0 rgba(255,255,255,.12),0 3px 8px rgba(0,0,0,.2);
}
.tablet-hand-cuff{
  position:absolute;
  left:23px;
  bottom:124px;
  width:62px;
  height:32px;
  border-radius:15px;
  background:linear-gradient(180deg,#252d31,#171d20);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.05);
}
.tablet-hand-palm{
  position:absolute;
  left:18px;
  bottom:139px;
  width:72px;
  height:63px;
  border-radius:28px 28px 20px 20px;
  background:
    radial-gradient(circle at 34% 22%,rgba(255,255,255,.07),transparent 28%),
    linear-gradient(145deg,#252d31,#111719 78%);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.045),inset -12px -8px 18px rgba(0,0,0,.22);
}
.tablet-hand-knuckle{
  position:absolute;
  left:25px;
  bottom:183px;
  width:58px;
  height:15px;
  border-radius:9px;
  background:linear-gradient(180deg,#394348,#22292d);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.04);
}
.tablet-hand-finger{
  position:absolute;
  top:-13px;
  width:16px;
  height:42px;
  border-radius:12px;
  background:linear-gradient(90deg,#171d20,#2a3337 48%,#111719);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.035);
}
.tablet-hand-finger-1{left:2px;transform:rotate(-7deg)}
.tablet-hand-finger-2{left:18px;top:-17px}
.tablet-hand-finger-3{left:35px;top:-16px}
.tablet-hand-finger-4{left:52px;transform:rotate(7deg)}
.tablet-hand-thumb{
  position:absolute;
  width:23px;
  height:48px;
  border-radius:15px;
  background:linear-gradient(90deg,#151b1e,#2b3438 52%,#111719);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.035);
}
.tablet-hand-grip-left .tablet-hand-thumb{right:-11px;top:17px;transform:rotate(-38deg)}
.tablet-hand-grip-right .tablet-hand-thumb{left:-11px;top:17px;transform:rotate(38deg)}
.tablet-hand-grip-left .tablet-hand-palm,.tablet-hand-grip-left .tablet-hand-knuckle{transform:rotate(-8deg)}
.tablet-hand-grip-right .tablet-hand-palm,.tablet-hand-grip-right .tablet-hand-knuckle{transform:rotate(8deg)}
.tablet.open .tablet-hand-grip-left{animation:tablet-hand-idle-left 4.2s ease-in-out .34s infinite}
.tablet.open .tablet-hand-grip-right{animation:tablet-hand-idle-right 4.2s ease-in-out .34s infinite}
@keyframes tablet-hand-idle-left{
  0%,100%{transform:translate3d(0,0,0) rotate(8deg)}
  50%{transform:translate3d(1px,-3px,0) rotate(7deg)}
}
@keyframes tablet-hand-idle-right{
  0%,100%{transform:translate3d(0,0,0) rotate(-8deg)}
  50%{transform:translate3d(-1px,-3px,0) rotate(-7deg)}
}
@media(max-width:560px){
  .tablet{width:min(430px,calc(100vw - 68px))}
  .tablet-hand-grip{bottom:58px;width:88px;height:184px;transform-origin:50% 100%}
  .tablet-hand-grip-left{left:-58px}
  .tablet-hand-grip-right{right:-58px}
  .tablet-hand-sleeve{left:21px;width:48px;height:118px}
  .tablet-hand-cuff{left:19px;bottom:101px;width:52px;height:28px}
  .tablet-hand-palm{left:15px;bottom:113px;width:60px;height:54px}
  .tablet-hand-knuckle{left:20px;bottom:150px;width:50px}
  .tablet-hand-finger{width:13px;height:35px}
  .tablet-hand-finger-1{left:2px}
  .tablet-hand-finger-2{left:15px}
  .tablet-hand-finger-3{left:29px}
  .tablet-hand-finger-4{left:43px}
  .tablet-hand-thumb{width:19px;height:40px}
}
@media(max-width:380px){
  .tablet{width:calc(100vw - 58px)}
  .tablet-hand-grip-left{left:-54px}
  .tablet-hand-grip-right{right:-54px}
}
@media(prefers-reduced-motion:reduce){
  .tablet-hand-grip{transition:none!important;animation:none!important}
}
`;
  document.head.appendChild(style);
}

export function installTabletHeldViewmodel() {
  if (installed) return;
  installed = true;
  installStyles();

  const tablet = document.querySelector('#tablet');
  if (!tablet || tablet.querySelector('.tablet-hand-grip')) return;
  tablet.append(buildGrip('left'), buildGrip('right'));
}
