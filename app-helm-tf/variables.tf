variable "kubeconfig_path" { type = string }
variable "charts_root" { type = string default = "../charts" }
variable "namespace" { type = string default = "default" }

variable "use_internal_mysql" { type = bool default = true }

variable "web_image_tag" { type = string default = "v1" }
variable "api_image_tag" { type = string default = "v1" }
variable "db_password" { type = string default = "Kaizen123" sensitive = true }

variable "external_db_host" { type = string default = "" }
variable "external_db_name" { type = string default = "appdb" }
variable "external_db_user" { type = string default = "Kaizen" }