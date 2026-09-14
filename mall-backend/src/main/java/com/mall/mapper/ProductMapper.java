package com.mall.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.mall.entity.Product;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface ProductMapper extends BaseMapper<Product> {
    
    @Select("SELECT p.*, c.name as category_name FROM product p " +
            "LEFT JOIN category c ON p.category_id = c.id " +
            "ORDER BY p.status DESC, p.sort ASC, p.create_time DESC")
    List<Product> selectProductsWithCategory();

    @Select("SELECT p.*, c.name as category_name FROM product p " +
            "LEFT JOIN category c ON p.category_id = c.id " +
            "WHERE p.category_id = #{categoryId} " +
            "ORDER BY p.status DESC, p.sort ASC, p.create_time DESC")
    List<Product> selectByCategoryId(@Param("categoryId") Long categoryId);

    IPage<Product> selectPageWithCategory(Page<Product> page, @Param("keyword") String keyword, @Param("categoryId") Long categoryId, @Param("status") Integer status);
}
