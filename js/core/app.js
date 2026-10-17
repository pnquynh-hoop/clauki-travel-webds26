/* app.js - điểm vào: khai bảng tra component rồi gọi core.js để nạp thương hiệu và dựng trang.
   Không import sẵn mọi component: core.js xem trang đang mở có những khối nào rồi mới tải đúng file JS, CSS
   của các khối đó, nên trang ít khối thì tải ít. Mỗi component một thư mục components/<tên>/ chứa wl-<tên>.js, <tên>.css
   và các file kiểu riêng, ví dụ components/hero/wl-hero.js ứng với thẻ <wl-hero>.

   Thêm component mới: thêm một dòng vào COMPONENTS.
   - load: hàm import file JS, trả về lớp của component;
   - css: đường dẫn các file CSS trong components/ (không có đuôi .css, ví dụ 'hero/hero-ride') mà component cần. */
import { start } from './core.js';

const COMPONENTS = {
  'wl-intro': { load: () => import('../../components/intro/wl-intro.js').then((m) => m.WlIntro), css: ['intro/intro', 'intro/intro-morph', 'shared/plate'] },
  'wl-journey': { load: () => import('../../components/journey/wl-journey.js').then((m) => m.WlJourney), css: ['journey/journey'] },
  'wl-hero': { load: () => import('../../components/hero/wl-hero.js').then((m) => m.WlHero), css: ['hero/hero', 'hero/hero-reveal', 'hero/hero-haze', 'hero/hero-ride'] },
  'wl-header': { load: () => import('../../components/header/wl-header.js').then((m) => m.WlHeader), css: ['header/header'] },
  'wl-footer': { load: () => import('../../components/footer/wl-footer.js').then((m) => m.WlFooter), css: ['footer/footer'] },
  'wl-host': { load: () => import('../../components/host/wl-host.js').then((m) => m.WlHost), css: ['host/host', 'host/host-tv'] },
  'wl-day-plan': { load: () => import('../../components/day-plan/wl-day-plan.js').then((m) => m.WlDayPlan), css: ['day-plan/day-plan'] },
  'wl-booking': { load: () => import('../../components/booking/wl-booking.js').then((m) => m.WlBooking), css: ['booking/booking', 'booking/booking-calendar', 'booking/booking-wall', 'booking/booking-ticket'] },
  'wl-faq': { load: () => import('../../components/faq/wl-faq.js').then((m) => m.WlFaq), css: ['faq/faq'] },
  'wl-gallery': { load: () => import('../../components/gallery/wl-gallery.js').then((m) => m.WlGallery), css: ['gallery/gallery'] },
  'wl-stays': { load: () => import('../../components/stays/wl-stays.js').then((m) => m.WlStays), css: ['stays/stays'] },
  'wl-offer': { load: () => import('../../components/offer/wl-offer.js').then((m) => m.WlOffer), css: ['offer/offer'] },
  'wl-to-top': { load: () => import('../../components/to-top/wl-to-top.js').then((m) => m.WlToTop), css: ['to-top/to-top'] },
  'wl-cloud-band': { load: () => import('../../components/cloud-band/wl-cloud-band.js').then((m) => m.WlCloudBand), css: ['cloud-band/cloud-band'] },
  'wl-process': { load: () => import('../../components/process/wl-process.js').then((m) => m.WlProcess), css: ['process/process'] },
  'wl-reviews': { load: () => import('../../components/reviews/wl-reviews.js').then((m) => m.WlReviews), css: ['reviews/reviews'] },
  // Các khối của trang chi tiết (tour, hạng phòng). room-detail dựng cả trang bằng cách ghép các khối kia nên tải kèm
  // CSS của chúng; item-booking có thể lồng lộ trình (route) nên tải kèm route.css.
  'wl-room-detail': { load: () => import('../../components/room-detail/wl-room-detail.js').then((m) => m.WlRoomDetail), css: ['room-detail/room-detail', 'item-cover/item-cover', 'item-booking/item-booking', 'photo-strip/photo-strip', 'scene/scene', 'included/included', 'route/route', 'effects/lightbox'] },
  'wl-item-cover': { load: () => import('../../components/item-cover/wl-item-cover.js').then((m) => m.WlItemCover), css: ['item-cover/item-cover'] },
  'wl-item-booking': { load: () => import('../../components/item-booking/wl-item-booking.js').then((m) => m.WlItemBooking), css: ['item-booking/item-booking', 'route/route', 'effects/lightbox'] },
  'wl-photo-strip': { load: () => import('../../components/photo-strip/wl-photo-strip.js').then((m) => m.WlPhotoStrip), css: ['photo-strip/photo-strip', 'effects/lightbox'] },
  'wl-scene': { load: () => import('../../components/scene/wl-scene.js').then((m) => m.WlScene), css: ['scene/scene'] },
  'wl-included': { load: () => import('../../components/included/wl-included.js').then((m) => m.WlIncluded), css: ['included/included'] },
  'wl-clock': { load: () => import('../../components/clock/wl-clock.js').then((m) => m.WlClock), css: ['clock/clock'] },
  'wl-tips': { load: () => import('../../components/tips/wl-tips.js').then((m) => m.WlTips), css: ['tips/tips'] },
  'wl-policy': { load: () => import('../../components/policy/wl-policy.js').then((m) => m.WlPolicy), css: ['policy/policy'] },
  'wl-contact': { load: () => import('../../components/contact/wl-contact.js').then((m) => m.WlContact), css: ['contact/contact', 'contact/contact-bell', 'shared/plate'] },
  'wl-catalog-list': { load: () => import('../../components/catalog-list/wl-catalog-list.js').then((m) => m.WlCatalogList), css: ['catalog-list/catalog-list'] },
  'wl-breadcrumb': { load: () => import('../../components/breadcrumb/wl-breadcrumb.js').then((m) => m.WlBreadcrumb), css: ['breadcrumb/breadcrumb'] },
  'wl-backdrop': { load: () => import('../../components/backdrop/wl-backdrop.js').then((m) => m.WlBackdrop), css: ['backdrop/backdrop'] },
  'wl-custom-trip': { load: () => import('../../components/custom-trip/wl-custom-trip.js').then((m) => m.WlCustomTrip), css: ['custom-trip/custom-trip'] },
  // Thẻ kết quả dùng chung giao diện thẻ của catalog-list, nên tải kèm catalog-list.css.
  'wl-tour-pick': { load: () => import('../../components/tour-pick/wl-tour-pick.js').then((m) => m.WlTourPick), css: ['tour-pick/tour-pick', 'catalog-list/catalog-list'] },
  'wl-route': { load: () => import('../../components/route/wl-route.js').then((m) => m.WlRoute), css: ['route/route', 'effects/lightbox'] },
  'wl-cards': { load: () => import('../../components/cards/wl-cards.js').then((m) => m.WlCards), css: ['cards/cards'] },
  'wl-pictogram': { load: () => import('../../components/pictogram/wl-pictogram.js').then((m) => m.WlPictogram), css: ['pictogram/pictogram'] },
  'wl-medals': { load: () => import('../../components/medals/wl-medals.js').then((m) => m.WlMedals), css: ['medals/medals'] },
  'wl-coins': { load: () => import('../../components/coins/wl-coins.js').then((m) => m.WlCoins), css: ['coins/coins'] },
  'wl-timetable': { load: () => import('../../components/timetable/wl-timetable.js').then((m) => m.WlTimetable), css: ['timetable/timetable'] },
};

start(COMPONENTS);
