import mongoose, { Schema } from "mongoose";

const adminSchema = new Schema({
    username: {
        type: String, 
        required: true
    },
    password: {
        type: String,
        required: true,
    }
})

//Encrypt password before saving in DB
adminSchema.pre("save", async function (next) {
    //Run the function only if password is modified
    if (!this.isModified("password")) return next()

    this.password = await bcrypt.hash(this.password, 10)
    next()
})

//Create a method to check password
adminSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

export const Admin = mongoose.model("Admin", adminSchema)