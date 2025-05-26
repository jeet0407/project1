class ApiResponse{
    consttructor(statusCode , data , message = "Success"){
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = StatusCode < 400
    }
}

export default ApiResponse; 