/* Carousel slide renderer.
 *
 * Each slide is drawn directly onto an HTMLCanvasElement at a fixed export
 * resolution (1080x1350 portrait or 1080x1080 square). We draw text to the
 * canvas ourselves rather than rasterizing a DOM node — this gives
 * deterministic, high-quality output with reliable font and emoji rendering,
 * which html2canvas can't guarantee.
 */
(function () {
  "use strict";

  var FONT =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  var DIMS = {
    portrait: { w: 1080, h: 1350 },
    square: { w: 1080, h: 1080 },
  };

  // ---- low-level canvas helpers -------------------------------------------

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Wrap text into lines that fit maxWidth, honouring explicit newlines.
  function wrapLines(ctx, text, maxWidth) {
    var out = [];
    var paragraphs = String(text == null ? "" : text).split(/\n/);
    for (var p = 0; p < paragraphs.length; p++) {
      var words = paragraphs[p].split(/\s+/).filter(Boolean);
      if (!words.length) {
        out.push("");
        continue;
      }
      var line = words[0];
      for (var i = 1; i < words.length; i++) {
        var test = line + " " + words[i];
        if (ctx.measureText(test).width > maxWidth) {
          out.push(line);
          line = words[i];
        } else {
          line = test;
        }
      }
      out.push(line);
    }
    return out;
  }

  // Shrink font until the wrapped block fits within the available box.
  function fitText(ctx, text, opts) {
    var size = opts.max;
    while (size > opts.min) {
      ctx.font = opts.weight + " " + size + "px " + FONT;
      var lh = size * opts.lineHeight;
      var lines = wrapLines(ctx, text, opts.maxWidth);
      if (lines.length * lh <= opts.maxHeight) {
        return { size: size, lineHeight: lh, lines: lines };
      }
      size -= 2;
    }
    ctx.font = opts.weight + " " + opts.min + "px " + FONT;
    return {
      size: opts.min,
      lineHeight: opts.min * opts.lineHeight,
      lines: wrapLines(ctx, text, opts.maxWidth),
    };
  }

  function drawLines(ctx, lines, x, y, lineHeight, align) {
    ctx.textAlign = align || "left";
    for (var i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, y + i * lineHeight);
    }
    return y + lines.length * lineHeight;
  }

  function avatar(ctx, x, y, d, slide) {
    var b = slide.brand;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (b.avatarImage) {
      var img = b.avatarImage;
      // cover-fit the uploaded image into the circle
      var s = Math.max(d / img.width, d / img.height);
      var iw = img.width * s,
        ih = img.height * s;
      ctx.drawImage(img, x + (d - iw) / 2, y + (d - ih) / 2, iw, ih);
    } else {
      ctx.fillStyle = b.accent;
      ctx.fillRect(x, y, d, d);
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 " + Math.round(d * 0.4) + "px " + FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initials(b.name), x + d / 2, y + d / 2 + 2);
      ctx.textBaseline = "alphabetic";
    }
    ctx.restore();
  }

  function initials(name) {
    var parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return "·";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function verifiedBadge(ctx, x, y, size, color) {
    // scalloped blue seal with a white check
    var r = size / 2,
      cx = x + r,
      cy = y + r;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    var spikes = 8;
    for (var i = 0; i < spikes * 2; i++) {
      var ang = (Math.PI / spikes) * i - Math.PI / 2;
      var rad = i % 2 === 0 ? r : r * 0.82;
      var px = cx + Math.cos(ang) * rad;
      var py = cy + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = size * 0.1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.42, cy + r * 0.02);
    ctx.lineTo(cx - r * 0.1, cy + r * 0.34);
    ctx.lineTo(cx + r * 0.46, cy - r * 0.34);
    ctx.stroke();
    ctx.restore();
  }

  // ---- layouts ------------------------------------------------------------

  function paintBackground(ctx, W, H, slide) {
    var b = slide.brand;
    if (slide.mode === "creative") {
      var dark = slide.kind === "outro";
      var g = ctx.createLinearGradient(0, 0, W, H);
      if (dark) {
        g.addColorStop(0, "#0b1220");
        g.addColorStop(1, shade(b.accent, -0.55));
      } else {
        g.addColorStop(0, b.accent);
        g.addColorStop(1, shade(b.accent, -0.32));
      }
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      return;
    }
    // screenshot / custom: soft neutral backdrop tinted by accent
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, tint(b.accent, 0.92));
    bg.addColorStop(1, tint(b.accent, 0.84));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }

  function renderScreenshot(ctx, W, H, slide) {
    var b = slide.brand;
    var outro = slide.kind === "outro";
    var margin = Math.round(W * 0.066);
    var pad = Math.round(W * 0.06);
    var cardX = margin,
      cardY = margin,
      cardW = W - margin * 2,
      cardH = H - margin * 2;

    // card with drop shadow
    ctx.save();
    ctx.shadowColor = "rgba(15,23,42,0.18)";
    ctx.shadowBlur = 48;
    ctx.shadowOffsetY = 20;
    roundRect(ctx, cardX, cardY, cardW, cardH, 44);
    ctx.fillStyle = outro ? "#0f1419" : "#ffffff";
    ctx.fill();
    ctx.restore();

    var contentX = cardX + pad;
    var contentW = cardW - pad * 2;
    var ink = outro ? "#ffffff" : "#0f1419";
    var sub = outro ? "rgba(255,255,255,0.62)" : "#536471";

    // header: avatar + name/handle
    var d = Math.round(W * 0.11);
    var headY = cardY + pad;
    avatar(ctx, contentX, headY, d, slide);

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = ink;
    var nameSize = Math.round(W * 0.038);
    ctx.font = "700 " + nameSize + "px " + FONT;
    var nameX = contentX + d + Math.round(W * 0.028);
    var nameY = headY + nameSize + 6;
    ctx.fillText(b.name || "Your Name", nameX, nameY);
    if (b.verified) {
      var bw = ctx.measureText(b.name || "Your Name").width;
      verifiedBadge(ctx, nameX + bw + 14, nameY - nameSize + 4, nameSize, b.accent);
    }
    ctx.fillStyle = sub;
    ctx.font = "400 " + Math.round(W * 0.03) + "px " + FONT;
    ctx.fillText(handle(b.handle), nameX, nameY + Math.round(W * 0.042));

    // footer (faux meta + brand)
    var footerY = cardY + cardH - pad;
    ctx.fillStyle = sub;
    ctx.font = "400 " + Math.round(W * 0.026) + "px " + FONT;
    ctx.fillText("Slide " + slide.index + " of " + slide.total, contentX, footerY);
    var madeW = ctx.measureText("Made with Carousel").width;
    ctx.fillText("Made with Carousel", cardX + cardW - pad - madeW, footerY);
    // divider above footer
    ctx.strokeStyle = outro ? "rgba(255,255,255,0.14)" : "#eff3f4";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(contentX, footerY - Math.round(W * 0.05));
    ctx.lineTo(cardX + cardW - pad, footerY - Math.round(W * 0.05));
    ctx.stroke();

    // body region: between header and footer, vertically centred
    var bodyTop = nameY + Math.round(W * 0.085);
    var bodyBottom = footerY - Math.round(W * 0.09);
    var availH = bodyBottom - bodyTop;

    var hasImage = slide.includeImages && slide.imagePrompt;
    var imgH = hasImage ? Math.round(contentW / 1.5) : 0; // 3:2
    var imgGap = hasImage ? Math.round(W * 0.04) : 0;

    var fit = fitText(ctx, slide.text, {
      max: outro ? Math.round(W * 0.058) : Math.round(W * 0.052),
      min: Math.round(W * 0.03),
      weight: outro ? "700" : "500",
      lineHeight: 1.32,
      maxWidth: contentW,
      maxHeight: availH - imgH - imgGap,
    });

    var blockH = fit.lines.length * fit.lineHeight + imgH + imgGap;
    var startY = bodyTop + (availH - blockH) / 2 + fit.size;

    ctx.fillStyle = ink;
    ctx.font = (outro ? "700 " : "500 ") + fit.size + "px " + FONT;
    var afterText = drawLines(ctx, fit.lines, contentX, startY, fit.lineHeight, "left");

    if (hasImage) {
      var iy = afterText - fit.size + Math.round(W * 0.02) + imgGap;
      drawImagePlaceholder(ctx, contentX, iy, contentW, imgH, slide);
    }

    if (outro) {
      // CTA pill
      var ctaText = "Follow " + handle(b.handle);
      ctx.font = "700 " + Math.round(W * 0.03) + "px " + FONT;
      var tw = ctx.measureText(ctaText).width;
      var pillW = tw + Math.round(W * 0.08);
      var pillH = Math.round(W * 0.075);
      var pillX = contentX;
      var pillY = footerY - Math.round(W * 0.05) - pillH - Math.round(W * 0.04);
      roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
      ctx.fillStyle = b.accent;
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.fillText(ctaText, pillX + Math.round(W * 0.04), pillY + pillH / 2 + Math.round(W * 0.011));
    }
  }

  function renderCreative(ctx, W, H, slide) {
    var b = slide.brand;
    var pad = Math.round(W * 0.1);
    var contentW = W - pad * 2;

    // kicker (name / handle) top-left
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "700 " + Math.round(W * 0.03) + "px " + FONT;
    ctx.fillText((b.name || "Your Name").toUpperCase(), pad, pad + Math.round(W * 0.02));

    // big centred statement
    var fit = fitText(ctx, slide.text, {
      max: Math.round(W * 0.09),
      min: Math.round(W * 0.04),
      weight: "800",
      lineHeight: 1.18,
      maxWidth: contentW,
      maxHeight: H - pad * 2.6,
    });
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 " + fit.size + "px " + FONT;
    var blockH = fit.lines.length * fit.lineHeight;
    var startY = (H - blockH) / 2 + fit.size * 0.85;
    drawLines(ctx, fit.lines, W / 2, startY, fit.lineHeight, "center");

    // accent rule under text
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(W / 2 - 60, startY + blockH - fit.size + Math.round(W * 0.05));
    ctx.lineTo(W / 2 + 60, startY + blockH - fit.size + Math.round(W * 0.05));
    ctx.stroke();

    // footer: handle + slide counter
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "600 " + Math.round(W * 0.028) + "px " + FONT;
    ctx.textAlign = "left";
    ctx.fillText(handle(b.handle), pad, H - pad);
    ctx.textAlign = "right";
    ctx.fillText(slide.index + " / " + slide.total, W - pad, H - pad);
  }

  function drawImagePlaceholder(ctx, x, y, w, h, slide) {
    roundRect(ctx, x, y, w, h, 28);
    ctx.save();
    ctx.clip();
    var g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, tint(slide.brand.accent, 0.55));
    g.addColorStop(1, tint(slide.brand.accent, 0.3));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    // little image glyph + prompt caption
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "400 " + Math.round(w * 0.028) + "px " + FONT;
    ctx.textAlign = "center";
    var cap = wrapLines(ctx, "🖼  " + slide.imagePrompt, w * 0.86);
    var lh = Math.round(w * 0.038);
    var cy = y + h / 2 - ((cap.length - 1) * lh) / 2;
    for (var i = 0; i < Math.min(cap.length, 3); i++) {
      ctx.fillText(cap[i], x + w / 2, cy + i * lh);
    }
    ctx.restore();
  }

  // ---- colour utilities ---------------------------------------------------

  function parseHex(hex) {
    hex = String(hex || "#1d9bf0").replace("#", "");
    if (hex.length === 3)
      hex = hex
        .split("")
        .map(function (c) {
          return c + c;
        })
        .join("");
    return {
      r: parseInt(hex.slice(0, 2), 16) || 0,
      g: parseInt(hex.slice(2, 4), 16) || 0,
      b: parseInt(hex.slice(4, 6), 16) || 0,
    };
  }
  function toHex(c) {
    function h(n) {
      n = Math.max(0, Math.min(255, Math.round(n)));
      return ("0" + n.toString(16)).slice(-2);
    }
    return "#" + h(c.r) + h(c.g) + h(c.b);
  }
  // darken (amt<0) or lighten (amt>0)
  function shade(hex, amt) {
    var c = parseHex(hex);
    var t = amt < 0 ? 0 : 255;
    var p = Math.abs(amt);
    return toHex({
      r: c.r + (t - c.r) * p,
      g: c.g + (t - c.g) * p,
      b: c.b + (t - c.b) * p,
    });
  }
  // mix accent toward white by amt (0..1) — for soft tints
  function tint(hex, amt) {
    var c = parseHex(hex);
    return toHex({
      r: c.r + (255 - c.r) * amt,
      g: c.g + (255 - c.g) * amt,
      b: c.b + (255 - c.b) * amt,
    });
  }

  function handle(h) {
    h = String(h || "yourhandle").trim();
    return h[0] === "@" ? h : "@" + h;
  }

  // ---- public api ---------------------------------------------------------

  // slide: { text, kind:'hook'|'body'|'outro', index, total, mode, brand,
  //          includeImages, imagePrompt }
  function renderSlide(canvas, slide, format) {
    var dim = DIMS[format] || DIMS.portrait;
    canvas.width = dim.w;
    canvas.height = dim.h;
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, dim.w, dim.h);
    ctx.textBaseline = "alphabetic";
    paintBackground(ctx, dim.w, dim.h, slide);
    if (slide.mode === "creative") renderCreative(ctx, dim.w, dim.h, slide);
    else renderScreenshot(ctx, dim.w, dim.h, slide);
    return canvas;
  }

  window.CarouselRender = {
    renderSlide: renderSlide,
    DIMS: DIMS,
    initials: initials,
  };
})();
