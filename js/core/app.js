/* app.js - điểm vào: khai bảng tra component rồi gọi core.js để nạp thương hiệu và dựng trang.
   Không import sẵn mọi component: core.js xem trang đang mở có những khối nào rồi mới tải đúng file JS, CSS
   của các khối đó, nên trang ít khối thì tải ít. Mỗi component một file, đặt tên wl-<tên>.js,
   ví dụ js/components/wl-hero.js ứng với thẻ <wl-hero>.

   Thêm component mới: thêm một dòng vào COMPONENTS.
   - load: hàm import file JS, trả về lớp của component;
   - css: tên các file trong css/components/ (không có đuôi .css) mà component cần. */
import { start } from './core.js';

const COMPONENTS = {
  'wl-intro': { load: () => import('../components/wl-intro.js').then((m) => m.WlIntro), css: ['intro', 'intro-morph', 'plate'] },
  'wl-journey': { load: () => import('../components/wl-journey.js').then((m) => m.WlJourney), css: ['journey'] },
  'wl-hero': { load: () => import('../components/wl-hero.js').then((m) => m.WlHero), css: ['hero', 'hero-reveal', 'hero-haze', 'hero-ride'] },
  'wl-header': { load: () => import('../components/wl-header.js').then((m) => m.WlHeader), css: ['header'] },
  'wl-footer': { load: () => import('../components/wl-footer.js').then((m) => m.WlFooter), css: ['footer'] },
  'wl-host': { load: () => import('../components/wl-host.js').then((m) => m.WlHost), css: ['host', 'host-tv'] },
  'wl-day-plan': { load: () => import('../components/wl-day-plan.js').then((m) => m.WlDayPlan), css: ['day-plan'] },
  'wl-booking': { load: () => import('../components/wl-booking.js').then((m) => m.WlBooking), css: ['booking'] },
  'wl-faq': { load: () => import('../components/wl-faq.js').then((m) => m.WlFaq), css: ['faq'] },
  'wl-gallery': { load: () => import('../components/wl-gallery.js').then((m) => m.WlGallery), css: ['gallery'] },
  'wl-stays': { load: () => import('../components/wl-stays.js').then((m) => m.WlStays), css: ['stays'] },
  'wl-offer': { load: () => import('../components/wl-offer.js').then((m) => m.WlOffer), css: ['offer'] },
  'wl-to-top': { load: () => import('../components/wl-to-top.js').then((m) => m.WlToTop), css: ['to-top'] },
  'wl-cloud-band': { load: () => import('../components/wl-cloud-band.js').then((m) => m.WlCloudBand), css: ['cloud-band'] },
  'wl-process': { load: () => import('../components/wl-process.js').then((m) => m.WlProcess), css: ['process'] },
  'wl-reviews': { load: () => import('../components/wl-reviews.js').then((m) => m.WlReviews), css: ['reviews'] },
  // Các khối của trang chi tiết (tour, hạng phòng). room-detail dựng cả trang bằng cách ghép các khối kia nên tải kèm
  // CSS của chúng; item-booking có thể lồng lộ trình (route) nên tải kèm route.css.
  'wl-room-detail': { load: () => import('../components/wl-room-detail.js').then((m) => m.WlRoomDetail), css: ['room-detail', 'item-cover', 'item-booking', 'photo-strip', 'scene', 'included', 'route', 'lightbox'] },
  'wl-item-cover': { load: () => import('../components/wl-item-cover.js').then((m) => m.WlItemCover), css: ['item-cover'] },
  'wl-item-booking': { load: () => import('../components/wl-item-booking.js').then((m) => m.WlItemBooking), css: ['item-booking', 'route', 'lightbox'] },
  'wl-photo-strip': { load: () => import('../components/wl-photo-strip.js').then((m) => m.WlPhotoStrip), css: ['photo-strip', 'lightbox'] },
  'wl-scene': { load: () => import('../components/wl-scene.js').then((m) => m.WlScene), css: ['scene'] },
  'wl-included': { load: () => import('../components/wl-included.js').then((m) => m.WlIncluded), css: ['included'] },
  'wl-clock': { load: () => import('../components/wl-clock.js').then((m) => m.WlClock), css: ['clock'] },
  'wl-tips': { load: () => import('../components/wl-tips.js').then((m) => m.WlTips), css: ['tips'] },
  'wl-policy': { load: () => import('../components/wl-policy.js').then((m) => m.WlPolicy), css: ['policy'] },
  'wl-contact': { load: () => import('../components/wl-contact.js').then((m) => m.WlContact), css: ['contact', 'contact-bell', 'plate'] },
  'wl-catalog-list': { load: () => import('../components/wl-catalog-list.js').then((m) => m.WlCatalogList), css: ['catalog-list'] },
  'wl-breadcrumb': { load: () => import('../components/wl-breadcrumb.js').then((m) => m.WlBreadcrumb), css: ['breadcrumb'] },
  'wl-backdrop': { load: () => import('../components/wl-backdrop.js').then((m) => m.WlBackdrop), css: ['backdrop'] },
  'wl-custom-trip': { load: () => import('../components/wl-custom-trip.js').then((m) => m.WlCustomTrip), css: ['custom-trip'] },
  // Thẻ kết quả dùng chung giao diện thẻ của catalog-list, nên tải kèm catalog-list.css.
  'wl-tour-pick': { load: () => import('../components/wl-tour-pick.js').then((m) => m.WlTourPick), css: ['tour-pick', 'catalog-list'] },
  'wl-route': { load: () => import('../components/wl-route.js').then((m) => m.WlRoute), css: ['route', 'lightbox'] },
  'wl-cards': { load: () => import('../components/wl-cards.js').then((m) => m.WlCards), css: ['cards'] },
  'wl-pictogram': { load: () => import('../components/wl-pictogram.js').then((m) => m.WlPictogram), css: ['pictogram'] },
  'wl-medals': { load: () => import('../components/wl-medals.js').then((m) => m.WlMedals), css: ['medals'] },
  'wl-coins': { load: () => import('../components/wl-coins.js').then((m) => m.WlCoins), css: ['coins'] },
  'wl-timetable': { load: () => import('../components/wl-timetable.js').then((m) => m.WlTimetable), css: ['timetable'] },
};

start(COMPONENTS);
