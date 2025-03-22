// BOJ - 17427 약수의 합 2

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
 
using namespace std;
 
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    ll n; cin >> n;
    ll ans = 0;
    loop(i, 1, n) ans += (i * (n / i));
    cout << ans << '\n';
}