package com.mall.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.mall.dto.CartDTO;
import com.mall.dto.CartVO;
import com.mall.entity.Cart;

import java.util.List;

public interface CartService extends IService<Cart> {

    List<CartVO> getCartList(String userId);

    void addToCart(String userId, CartDTO dto);

    void updateQuantity(String userId, String productId, Integer quantity);

    void updateQuantity(String userId, String cartId, String productId, String tierId, Integer quantity);

    void changeQuantity(String userId, String productId, Integer delta);

    void deleteCartItem(String userId, String productId);

    void deleteById(String userId, String cartId);

    void clearCart(String userId);

    Integer getCartCount(String userId);
}
