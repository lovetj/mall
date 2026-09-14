package com.mall.controller;

import com.mall.dto.CartDTO;
import com.mall.dto.CartVO;
import com.mall.service.CartService;
import com.mall.util.JwtUtil;
import com.mall.common.Result;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    @Autowired
    private CartService cartService;

    @Autowired
    private JwtUtil jwtUtil;

    private Long resolveUserId(String authorization, Long headerUserId) {
        if (authorization != null && !authorization.trim().isEmpty()) {
            if (jwtUtil.validateToken(authorization)) {
                return jwtUtil.getUserId(authorization);
            }
        }
        if (headerUserId != null && headerUserId > 0) {
            return headerUserId;
        }
        return null;
    }

    @GetMapping("/list")
    public Result<List<CartVO>> list(@RequestHeader(value = "Authorization", required = false) String authorization,
                                     @RequestHeader(value = "userId", required = false) Long headerUserId) {
        Long userId = resolveUserId(authorization, headerUserId);
        if (userId == null) {
            return Result.error(401, "用户未登录，请先登录");
        }
        return Result.success(cartService.getCartList(userId));
    }

    @GetMapping("/count")
    public Result<Integer> count(@RequestHeader(value = "Authorization", required = false) String authorization,
                                 @RequestHeader(value = "userId", required = false) Long headerUserId) {
        Long userId = resolveUserId(authorization, headerUserId);
        if (userId == null) {
            return Result.success(0);
        }
        return Result.success(cartService.getCartCount(userId));
    }

    @PostMapping("/add")
    public Result<Void> add(@Valid @RequestBody CartDTO dto,
                            @RequestHeader(value = "Authorization", required = false) String authorization,
                            @RequestHeader(value = "userId", required = false) Long headerUserId) {
        Long userId = resolveUserId(authorization, headerUserId);
        if (userId == null) {
            return Result.error(401, "用户未登录，请先登录");
        }
        cartService.addToCart(userId, dto);
        return Result.success();
    }

    @PostMapping("/update")
    public Result<Void> update(@RequestBody Map<String, Object> params,
                               @RequestHeader(value = "Authorization", required = false) String authorization,
                               @RequestHeader(value = "userId", required = false) Long headerUserId) {
        Long userId = resolveUserId(authorization, headerUserId);
        if (userId == null) {
            return Result.error(401, "用户未登录，请先登录");
        }

        Object productIdObj = params.get("productId");
        Object quantityObj = params.get("quantity");
        if (productIdObj == null || quantityObj == null) {
            return Result.error("参数不完整");
        }

        Long productId = Long.valueOf(productIdObj.toString());
        Integer quantity = Integer.valueOf(quantityObj.toString());

        cartService.updateQuantity(userId, productId, quantity);
        return Result.success();
    }

    @PostMapping("/change")
    public Result<Void> change(@RequestBody Map<String, Object> params,
                               @RequestHeader(value = "Authorization", required = false) String authorization,
                               @RequestHeader(value = "userId", required = false) Long headerUserId) {
        Long userId = resolveUserId(authorization, headerUserId);
        if (userId == null) {
            return Result.error(401, "用户未登录，请先登录");
        }

        Object productIdObj = params.get("productId");
        Object deltaObj = params.get("delta");
        if (productIdObj == null || deltaObj == null) {
            return Result.error("参数不完整");
        }

        Long productId = Long.valueOf(productIdObj.toString());
        Integer delta = Integer.valueOf(deltaObj.toString());

        cartService.changeQuantity(userId, productId, delta);
        return Result.success();
    }

    @DeleteMapping("/product/{productId}")
    public Result<Void> deleteByProduct(@PathVariable Long productId,
                                        @RequestHeader(value = "Authorization", required = false) String authorization,
                                        @RequestHeader(value = "userId", required = false) Long headerUserId) {
        Long userId = resolveUserId(authorization, headerUserId);
        if (userId == null) {
            return Result.error(401, "用户未登录，请先登录");
        }
        cartService.deleteCartItem(userId, productId);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> deleteById(@PathVariable Long id,
                                   @RequestHeader(value = "Authorization", required = false) String authorization,
                                   @RequestHeader(value = "userId", required = false) Long headerUserId) {
        Long userId = resolveUserId(authorization, headerUserId);
        if (userId == null) {
            return Result.error(401, "用户未登录，请先登录");
        }
        cartService.deleteById(userId, id);
        return Result.success();
    }

    @DeleteMapping("/clear")
    public Result<Void> clear(@RequestHeader(value = "Authorization", required = false) String authorization,
                              @RequestHeader(value = "userId", required = false) Long headerUserId) {
        Long userId = resolveUserId(authorization, headerUserId);
        if (userId == null) {
            return Result.error(401, "用户未登录，请先登录");
        }
        cartService.clearCart(userId);
        return Result.success();
    }
}
