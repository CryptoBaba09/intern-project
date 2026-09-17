from PIL import Image, ImageDraw, ImageFont

W, H = 800, 450
BG = (11,12,11)
GREEN = (0,200,5)
AMBER = (217,164,65)
TEXT = (237,238,240)
GREY = (155,161,166)
DIM = (74,79,84)
BORDER = (27,29,27)
RED = (229,72,77)

FB = "/System/Library/Fonts/Menlo.ttc"
def F(size, bold=False):
    return ImageFont.truetype(FB, size, index=1 if bold else 0)

def base(draw_fn, n_frames, durations, outname, size=(W,H)):
    frames = []
    for i in range(n_frames):
        img = Image.new('RGB', size, BG)
        d = ImageDraw.Draw(img)
        draw_fn(d, i, img)
        frames.append(img)
    frames[0].save(outname, save_all=True, append_images=frames[1:], duration=durations, loop=0, optimize=True)
    print('saved', outname)

def label(d, text, x, y, color=GREEN, size=20, bold=True):
    d.text((x,y), text, font=F(size,bold), fill=color)

# 1. 70/20/10 split bar build
def split_frame(d, i, img):
    label(d, "CREATOR FEES SPLIT", 48, 44)
    segs = [("BURN 70%", 0.70, GREEN), ("STAKE 20%", 0.20, AMBER), ("TREASURY 10%", 0.10, GREY)]
    bx0, by0, bx1, by1 = 48, 130, W-48, 170
    d.rounded_rectangle([bx0,by0,bx1,by1], radius=14, fill=BORDER)
    reveal = min(i, len(segs))
    x = bx0
    total_w = bx1-bx0
    for idx,(lbl,frac,color) in enumerate(segs):
        seg_w = int(total_w*frac)
        if idx < reveal:
            d.rounded_rectangle([x,by0,x+seg_w,by1], radius=0 if idx>0 else 14, fill=color)
        x += seg_w
    ly = 200
    for idx,(lbl,frac,color) in enumerate(segs):
        opac = 255 if idx < reveal else 60
        c = tuple(list(color))
        d.ellipse([48, ly+idx*40+4, 62, ly+idx*40+18], fill=color if idx<reveal else DIM)
        d.text((74, ly+idx*40), lbl, font=F(19), fill=TEXT if idx<reveal else DIM)
    label(d, "every claim, automatically. no deploy step.", 48, H-56, DIM, 15, False)

base(split_frame, 5, [700,700,700,700,1600], "split-7020 10.gif".replace(" ",""))

# 2. BE streaming to stakers
def stream_frame(d, i, img):
    label(d, "FEES -> STAKERS", 48, 44)
    box1 = (60, 160, 300, 260)
    box2 = (500, 160, 740, 260)
    d.rounded_rectangle(box1, radius=16, outline=AMBER, width=3)
    d.text((box1[0]+30, box1[1]+35), "BE FEES", font=F(20,True), fill=AMBER)
    d.rounded_rectangle(box2, radius=16, outline=GREEN, width=3)
    d.text((box2[0]+20, box2[1]+35), "STAKERS", font=F(20,True), fill=GREEN)
    dot_positions = [0.15,0.4,0.65,0.9]
    offset = (i%4)*0.25
    for base_pos in dot_positions:
        pos = (base_pos+offset) % 1.0
        x = int(box1[2] + pos*(box2[0]-box1[2]))
        y = 210
        d.ellipse([x-8,y-8,x+8,y+8], fill=AMBER)
    label(d, "streamed continuously, time-weighted by stake.", 48, H-56, DIM, 15, False)

base(stream_frame, 4, [280,280,280,280], "stream-be.gif")

# 3. Mint -> Stake -> Burn sequence
def mint_frame(d, i, img):
    label(d, "GENESIS INTERNS", 48, 44, GREEN, 18)
    steps = ["MINT", "STAKE", "BURN"]
    colors = [GREEN, AMBER, RED]
    cy = 220
    total_w = 700
    x0 = 50
    gap = total_w // 2
    for idx,(s,c) in enumerate(zip(steps,colors)):
        x = x0 + idx*gap
        active = idx == (i % 3)
        fill = c if active else BORDER
        txtcol = (11,12,11) if active else DIM
        d.rounded_rectangle([x, cy-45, x+190, cy+45], radius=18, fill=fill)
        w = d.textlength(s, font=F(30,True))
        d.text((x+95-w/2, cy-16), s, font=F(30,True), fill=txtcol if active else TEXT)
        if idx < 2:
            ax = x+205
            d.line([ax,cy,ax+35,cy], fill=DIM, width=3)
            d.polygon([(ax+35,cy-7),(ax+45,cy),(ax+35,cy+7)], fill=DIM)
    label(d, "500 supply. unlocks at $1M in real volume.", 48, H-56, DIM, 15, False)

base(mint_frame, 3, [900,900,900], "mint-stake-burn.gif")

# 4. Burn flash counter
def burn_frame(d, i, img):
    pulse = i % 2 == 1
    label(d, "BURN CONFIRMED", 48, 44, RED if pulse else DIM, 18)
    amt = "-1,204,318 $INTERN"
    color = TEXT if not pulse else (255,255,255)
    w = d.textlength(amt, font=F(42,True))
    d.text((W/2 - w/2, 180), amt, font=F(42,True), fill=color)
    fw = d.textlength("supply only ever goes down.", font=F(16))
    d.text((W/2-fw/2, 260), "supply only ever goes down.", font=F(16), fill=DIM)
    # simple flame glyph
    fx, fy = W/2 - 14, 320
    scale = 1.15 if pulse else 1.0
    pts = [(fx, fy+40*scale), (fx-16*scale, fy+10*scale), (fx-8*scale, fy-30*scale),
           (fx+4, fy-40*scale), (fx+16*scale, fy-10*scale), (fx+8*scale, fy+30*scale)]
    d.polygon(pts, fill=AMBER)

base(burn_frame, 2, [550,550], "burn-flash.gif")

# 5. BUY / SELL toggle
def buysell_frame(d, i, img):
    label(d, "TRADE $INTERN", 48, 44, GREEN, 18)
    label(d, "internburn.xyz/trade", 48, H-56, DIM, 15, False)
    buy_active = i % 2 == 0
    bx0,by0,bx1,by1 = 60, 150, 380, 230
    sx0,sy0,sx1,sy1 = 420, 150, 740, 230
    d.rounded_rectangle([bx0,by0,bx1,by1], radius=18, fill=GREEN if buy_active else BORDER)
    d.rounded_rectangle([sx0,sy0,sx1,sy1], radius=18, fill=RED if not buy_active else BORDER)
    bw = d.textlength("BUY", font=F(34,True))
    sw = d.textlength("SELL", font=F(34,True))
    d.text(((bx0+bx1)/2-bw/2, (by0+by1)/2-20), "BUY", font=F(34,True), fill=(11,12,11) if buy_active else TEXT)
    d.text(((sx0+sx1)/2-sw/2, (sy0+sy1)/2-20), "SELL", font=F(34,True), fill=(11,12,11) if not buy_active else TEXT)
    label(d, "we route you straight to Pons to do it.", 48, 280, GREY, 16, False)

base(buysell_frame, 2, [900,900], "buy-sell-toggle.gif")

# 6. STAKE -> EARN BE loop
def stakeflow_frame(d, i, img):
    label(d, "STAKE $INTERN", 48, 44)
    box1 = (60, 160, 320, 260)
    box2 = (520, 160, 740, 260)
    d.rounded_rectangle(box1, radius=16, fill=GREEN)
    d.text((box1[0]+55, box1[1]+35), "STAKE", font=F(24,True), fill=(11,12,11))
    d.rounded_rectangle(box2, radius=16, outline=AMBER, width=3)
    d.text((box2[0]+30, box2[1]+35), "EARN BE", font=F(22,True), fill=AMBER)
    ay = 210
    arrow_x = 330 + (i%3)*30
    d.line([340, ay, arrow_x+120, ay], fill=AMBER, width=4)
    d.polygon([(arrow_x+120,ay-8),(arrow_x+134,ay),(arrow_x+120,ay+8)], fill=AMBER)
    label(d, "no lockup. unstake any time.", 48, H-56, DIM, 15, False)

base(stakeflow_frame, 3, [400,400,400], "stake-earn-flow.gif")

# 7. Verify yourself typewriter
def verify_frame(d, i, img):
    label(d, "DON'T TRUST. VERIFY.", 48, 44, GREEN, 20)
    addr = "0x1293a4a3f090c091c7da6dcca6a3ba9201b0e1c8"
    n = int(len(addr) * min(1.0, (i+1)/6))
    shown = addr[:n]
    d.text((48, 200), shown, font=F(24,True), fill=TEXT)
    cursor = "_" if i % 2 == 0 else " "
    d.text((48+d.textlength(shown, font=F(24,True)), 200), cursor, font=F(24,True), fill=GREEN)
    label(d, "blockscout.com · every burn, every fee, public.", 48, 280, DIM, 16, False)

base(verify_frame, 7, [220,220,220,220,220,220,900], "verify-yourself.gif")

# 8. NO MINT FUNCTION stamp
def stamp_frame(d, i, img):
    label(d, "SUPPLY", 48, 44, GREEN, 18)
    d.text((48, 84), "1,000,000,000", font=F(40,True), fill=TEXT)
    if i >= 1:
        # stamp box
        sx0,sy0,sx1,sy1 = 470, 60, 750, 190
        rot_img = Image.new('RGBA', (sx1-sx0, sy1-sy0), (0,0,0,0))
        rd = ImageDraw.Draw(rot_img)
        rd.rounded_rectangle([4,4,sx1-sx0-4,sy1-sy0-4], radius=10, outline=RED, width=6)
        rd.text((14,20), "NO MINT", font=F(26,True), fill=RED)
        rd.text((14,58), "FUNCTION", font=F(26,True), fill=RED)
        rd.text((14,96), "EVER.", font=F(26,True), fill=RED)
        rot = rot_img.rotate(-8, expand=True, resample=Image.BICUBIC)
        img.paste(rot, (sx0-10, sy0-10), rot)
    label(d, "can't be added back. not by us, not by anyone.", 48, H-56, DIM, 15, False)

base(stamp_frame, 2, [500,1300], "no-mint-stamp.gif")

print("ALL DONE")
