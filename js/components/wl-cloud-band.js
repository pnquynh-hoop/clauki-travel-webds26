/* wl-cloud-band.js - dải mây vắt ngang chỗ nối hai khối, làm mềm chỗ chuyển từ khối này sang khối kia.
   Đặt bằng một mục { "type": "cloud-band" } trong mảng sections, ngay giữa hai khối cần nối. Thương hiệu nào
   không thêm mục này thì không có mây. Khối chỉ để trang trí: không có chữ, trình đọc màn hình bỏ qua. */

function bandEl(layer) {
  const band = document.createElement('div');
  band.className = `cloud-band__band cloud-band__band--${layer}`;
  return band;
}

export class WlCloudBand extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  render() {
    const section = this._data ?? {};
    this.className = section.variant ? `cloud-band cloud-band--${section.variant}` : 'cloud-band';
    this.setAttribute('aria-hidden', 'true');

    // Hai dải mây chồng lên nhau trong một khung: dải sau mỏng và trôi chậm, dải trước dày và trôi nhanh hơn.
    const clip = document.createElement('div');
    clip.className = 'cloud-band__clip';
    clip.append(bandEl('back'), bandEl('front'));
    this.replaceChildren(clip);
  }
}
