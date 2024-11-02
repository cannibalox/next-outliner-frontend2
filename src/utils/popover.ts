export type PopoverPos = {
  leftDown: { x: number; y: number };
  leftUp: { x: number; y: number };
  rightDown: { x: number; y: number };
  rightUp: { x: number; y: number };
};

export const calcPopoverPos = (
  width: number,
  height: number,
  x: number,
  y: number,
  options: {
    // 距离屏幕边缘的最小距离
    minMargin?: number;
    offset?: (pos: PopoverPos) => PopoverPos;
    // 避免与某个元素碰撞
    avoidColideWith?: HTMLElement;
    // 碰撞检测的最小距离，弹出窗口与指定元素的距离小于该值时，则认为碰撞
    minCollisionDist?: number;
  } = {},
) => {
  const offset = options.offset ?? ((pos) => pos);
  const minMargin = options.minMargin ?? 20;

  // 获取屏幕尺寸
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  // 计算向 leftDown, leftUp, rightDown, rightUp 弹出时窗口的位置
  const ret = offset({
    leftDown: {
      x: x - width,
      y: y,
    },
    leftUp: {
      x: x - width,
      y: y - height,
    },
    rightDown: {
      x: x,
      y: y,
    },
    rightUp: {
      x: x,
      y: y - height,
    },
  });

  // 调整保证 popover 不超出屏幕
  // 1. 向左弹出，确保左边界不超出屏幕左侧
  for (const dir of ['leftDown', 'leftUp'] as const) {
    if (ret[dir].x < minMargin) {
      ret[dir].x = minMargin;
    }
  }
  // 2. 向右弹出，确保右边界不超出屏幕右侧
  for (const dir of ['rightDown', 'rightUp'] as const) {
    if (ret[dir].x + width > screenWidth - minMargin) {
      ret[dir].x = screenWidth - minMargin - width;
    }
  }
  // 3. 向上弹出，确保上边界不超出屏幕上侧
  for (const dir of ['leftUp', 'rightUp'] as const) {
    if (ret[dir].y < minMargin) {
      ret[dir].y = minMargin;
    }
  }
  // 4. 向下弹出，确保下边界不超出屏幕下侧
  for (const dir of ['leftDown', 'rightDown'] as const) {
    if (ret[dir].y + height > screenHeight - minMargin) {
      ret[dir].y = screenHeight - minMargin - height;
    }
  }

  // 调整弹出位置，防止与指定元素碰撞
  if (options.avoidColideWith) {
    const elRect = options.avoidColideWith.getBoundingClientRect();
    const minCollisionDist = options.minCollisionDist ?? 10;

    for (const dir of ['leftDown', 'leftUp', 'rightDown', 'rightUp'] as const) {
      const pos = ret[dir];

      // 检查两个矩形是否相交
      const intersects =
        pos.x < elRect.right + minCollisionDist &&
        pos.x + width > elRect.left - minCollisionDist &&
        pos.y < elRect.bottom + minCollisionDist &&
        pos.y + height > elRect.top - minCollisionDist;

      if (intersects) {
        // 如果相交，则调整弹出位置
        if (pos.x < elRect.left) // 向左调整
          pos.x = Math.max(elRect.left - minCollisionDist - width, minMargin);
        // 向右调整
        else pos.x = Math.min(elRect.right + minCollisionDist, screenWidth - minMargin - width);

        if (pos.y < elRect.top) // 向上调整
          pos.y = Math.max(elRect.top - minCollisionDist - height, minMargin);
        // 向下调整
        else pos.y = Math.min(elRect.bottom + minCollisionDist, screenHeight - minMargin - height);
      }
    }
  }

  return ret;
};

export const clip = (val: number, b1: number, b2: number) => {
  if (b1 > b2) [b1, b2] = [b2, b1];
  if (val < b1) return b1;
  else if (val > b2) return b2;
  return val;
};