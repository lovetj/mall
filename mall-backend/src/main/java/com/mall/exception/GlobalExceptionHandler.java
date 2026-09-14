package com.mall.exception;

import com.mall.common.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import javax.servlet.http.HttpServletRequest;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public Result<Void> handleMaxUploadSizeExceededException(MaxUploadSizeExceededException e, HttpServletRequest request) {
        log.warn("上传文件大小超出限制 [{} {}]: {}", request != null ? request.getMethod() : "", request != null ? request.getRequestURI() : "", e.getMessage());
        return Result.error(400, "上传文件大小超出限制，单文件最大支持 50MB");
    }

    @ExceptionHandler(RuntimeException.class)
    public Result<Void> handleRuntimeException(RuntimeException e, HttpServletRequest request) {
        log.error("运行时异常 [{} {}]: {}", request != null ? request.getMethod() : "", request != null ? request.getRequestURI() : "", e.getMessage(), e);
        return Result.error(e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result<Void> handleValidationException(MethodArgumentNotValidException e, HttpServletRequest request) {
        String message = e.getBindingResult().getFieldError() != null 
                ? e.getBindingResult().getFieldError().getDefaultMessage() 
                : "参数验证失败";
        log.warn("参数校验失败 [{} {}]: {}", request != null ? request.getMethod() : "", request != null ? request.getRequestURI() : "", message);
        return Result.error(400, message);
    }

    @ExceptionHandler(Exception.class)
    public Result<Void> handleException(Exception e, HttpServletRequest request) {
        log.error("系统异常 [{} {}]: {}", request != null ? request.getMethod() : "", request != null ? request.getRequestURI() : "", e.getMessage(), e);
        return Result.error("系统异常，请稍后重试");
    }

    @ExceptionHandler(Throwable.class)
    public Result<Void> handleThrowable(Throwable t, HttpServletRequest request) {
        log.error("未捕获异常 [{} {}]: {}", request != null ? request.getMethod() : "", request != null ? request.getRequestURI() : "", t.getMessage(), t);
        return Result.error("系统繁忙，请稍后重试");
    }
}
