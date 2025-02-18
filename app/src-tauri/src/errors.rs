use std::{borrow::Cow, error::Error, fmt::Display};

pub struct SmallError(pub Cow<'static, str>);
pub type SmallResult<T> = Result<T, SmallError>;

// impl<E: Error> From<E> for SmallError {
//     fn from(e: E) -> Self {
//         Self(e.into())
//     }
// }

impl<D: Into<Cow<'static, str>>> From<D> for SmallError {
    fn from(e: D) -> Self {
        Self(e.into())
    }
}

impl Error for SmallError {}

impl std::fmt::Display for SmallError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::fmt::Debug for SmallError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        std::fmt::Display::fmt(&self, f)
    }
}

pub trait ResultExtDisplay<T> {
    fn context<D: Into<Cow<'static, str>>>(self, context: D) -> Result<T, SmallError>;
}

// pub trait ResultExt<T> {
//     fn context<D: Into<Cow<'static, str>>>(self, context: D) -> Result<T, SmallError>;
// }

impl<T, U: Display> ResultExtDisplay<T> for Result<T, U> {
    fn context<D: Into<Cow<'static, str>>>(self, context: D) -> Result<T, SmallError> {
        self.map_err(|e| SmallError(format!("{}: {}", context.into(), e).into()))
    }
}

// impl<T, U> ResultExt<T> for Result<T, U> {
//     fn context<D: Into<Cow<'static, str>>>(self, context: D) -> Result<T, SmallError> {
//         self
//             .map_err(|_| SmallError(context.into()))
//     }
// }
