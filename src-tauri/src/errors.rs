use std::io;

#[derive(thiserror::Error, Debug)]
pub enum AnyError {
    // #[error(transparent)]
    // Core(#[from] std::error::Error),
    
    #[error(transparent)]
    Io(#[from] std::io::Error),

    #[error(transparent)]
    Anyhow(#[from] anyhow::Error),

    #[error(transparent)]
    Serde(#[from] serde_json::Error),
}

// we must manually implement serde::Serialize
impl serde::Serialize for AnyError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer, {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

pub fn io_not_found(message: &str) -> AnyError {
    AnyError::Io(io::Error::new(io::ErrorKind::NotFound, message))
}

pub fn str_error(err: &str) -> AnyError {
    AnyError::Anyhow(anyhow::anyhow!("{}", err))
}