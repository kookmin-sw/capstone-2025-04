// BOJ - 10986 나머지 합

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define ll long long int
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    ll n, m, s = 0, arr[1000] = {0, }; cin >> n >> m;
    loop(i, 1, n) {
        ll k; cin >> k; s += k; arr[s % m]++;
    }
    ll ans = 0;
    LOOP(i, 0, m) ans += (arr[i] * arr[i] - arr[i]) / 2;
    cout << (arr[0] + ans) << '\n';
}