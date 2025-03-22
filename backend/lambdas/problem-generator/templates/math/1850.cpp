// BOJ - 1850 최대공약수

#include <bits/stdc++.h>
#define ll long long int
 
using namespace std;
ll gcd(ll a, ll b) { return !b ? a : gcd(b, a % b); }
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    ll a, b; cin >> a >> b; // 1의 개수
    for(int i = 1; i <= gcd(a, b); i++) cout << '1';
    cout << '\n';
}