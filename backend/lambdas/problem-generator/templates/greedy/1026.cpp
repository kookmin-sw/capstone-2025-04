// BOJ - 1026 보물

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define ll long long int
 
using namespace std;

int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    ll n; cin >> n;
    ll a[n], b[n];
    loop(i, 0, n - 1) cin >> a[i];
    loop(j, 0, n - 1) { cin >> b[j]; b[j] *= -1; }
    sort(a, a + n); sort(b, b + n);

    ll res = 0;
    loop(i, 0, n - 1) res -= a[i] * b[i];
    cout << res << '\n';
}